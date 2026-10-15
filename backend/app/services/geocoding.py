"""Provider-neutral, explicitly requested reverse geocoding.

There is no default external endpoint and no automatic complaint-create lookup.
Public Nominatim use additionally requires explicit operator opt-in, one worker
or an external application-wide limiter, attribution, and compliance with:
https://operations.osmfoundation.org/policies/nominatim/
"""
from collections import OrderedDict
from functools import lru_cache
from http.client import HTTPException as HTTPTransportError
import json
import os
import threading
import time
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from app.schemas.geocoding import ReverseGeocodeRequest, ReverseGeocodeResult

ATTRIBUTION = "© OpenStreetMap contributors — https://www.openstreetmap.org/copyright"


class ReverseGeocoder(Protocol):
    def reverse(self, location: ReverseGeocodeRequest) -> ReverseGeocodeResult: ...


class DisabledGeocoder:
    def reverse(self, location):
        return ReverseGeocodeResult()


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Coordinates must reach only the explicitly configured provider.
        return None


def _text(value, limit=200):
    if not isinstance(value, str):
        return None
    clean = " ".join(value.split()).strip()[:limit]
    return clean or None


class NominatimGeocoder:
    """Small REST adapter with bounded process-local cache and request gate.

    Address components vary by provider data. A missing ward is left absent;
    no municipality, department, accuracy or jurisdiction is inferred.
    """
    def __init__(self, endpoint, user_agent, *, allow_public=False,
                 cache_size=512, cache_ttl=3600, clock=time.monotonic):
        url = urlsplit(endpoint)
        if (url.scheme != "https" or not url.hostname or url.username or url.password
                or url.query or url.fragment or any(ch.isspace() for ch in endpoint)
                or not user_agent.strip() or len(user_agent) > 300
                or any(ord(ch) < 32 or ord(ch) > 126 for ch in user_agent)
                or user_agent.lower().startswith(("python-urllib", "python-requests", "curl/"))
                or cache_size < 1 or cache_ttl <= 0):
            raise ValueError("Configure an HTTPS geocoder endpoint and identifying User-Agent")
        if url.hostname.lower().rstrip(".") == "nominatim.openstreetmap.org" and not allow_public:
            raise ValueError("Public Nominatim requires explicit operator opt-in")
        self._endpoint = endpoint.rstrip("?")
        self._user_agent = user_agent
        self._cache_size = min(cache_size, 4096)
        self._cache_ttl = min(cache_ttl, 86400)
        self._clock = clock
        self._cache = OrderedDict()
        self._lock = threading.Lock()
        self._next_request = 0.0
        self._inflight = False

    def reverse(self, location):
        # No coordinate rounding: a cached answer never silently moves a pin.
        key = (location.latitude, location.longitude)
        with self._lock:
            now = self._clock()
            expired = [item for item, (expires, _) in self._cache.items() if expires <= now]
            for item in expired:
                del self._cache[item]
            cached = self._cache.get(key)
            if cached:
                self._cache.move_to_end(key)
                return cached[1].model_copy(update={"cached": True})
            if self._inflight or now < self._next_request:
                return ReverseGeocodeResult(status="rate_limited", source="nominatim")
            self._inflight = True
            self._next_request = now + 1.0
        result = ReverseGeocodeResult(status="unavailable", source="nominatim")
        try:
            result = self._lookup(location)
        finally:
            with self._lock:
                self._inflight = False
                # Publish cache entry atomically with releasing the gate.
                # Failed lookups also get short caching to avoid retries.
                ttl = self._cache_ttl if result.available else min(30, self._cache_ttl)
                self._cache[key] = (self._clock() + ttl, result)
                self._cache.move_to_end(key)
                while len(self._cache) > self._cache_size:
                    self._cache.popitem(last=False)
        return result

    def _lookup(self, location):
        query = urlencode({"lat": location.latitude, "lon": location.longitude,
                           "format": "jsonv2", "addressdetails": 1, "layer": "address"})
        request = Request(self._endpoint + "?" + query,
                          headers={"User-Agent": self._user_agent, "Accept": "application/json"})
        try:
            # The default HTTPS handler verifies certificates and hostname.
            # No logging of request URLs, coordinates, or provider bodies.
            with build_opener(_NoRedirect()).open(request, timeout=5) as response:
                raw = response.read(65_537)
            if len(raw) > 65_536:
                return ReverseGeocodeResult(status="unavailable", source="nominatim")
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                return ReverseGeocodeResult(status="unavailable", source="nominatim")
            if "error" in payload:
                return ReverseGeocodeResult(status="not_found", source="nominatim")
            address = payload.get("address", {})
            if not isinstance(address, dict):
                address = {}
            name = _text(payload.get("display_name"), 500)
            locality = next((_text(address.get(k)) for k in
                             ("suburb", "quarter", "neighbourhood", "village", "town", "city")
                             if _text(address.get(k))), None)
            area = next((_text(address.get(k)) for k in
                         ("city_district", "borough", "county", "state_district")
                         if _text(address.get(k))), None)
            ward = _text(address.get("ward"))
            if not any((name, locality, area, ward)):
                return ReverseGeocodeResult(status="not_found", source="nominatim")
            return ReverseGeocodeResult(available=True, status="ok", location_text=name,
                                        locality=locality, area=area, ward=ward,
                                        source="nominatim", attribution=_text(payload.get("licence"), 500) or ATTRIBUTION)
        except HTTPError as error:
            state = "rate_limited" if error.code == 429 else "not_found" if error.code == 404 else "unavailable"
            error.close()
            return ReverseGeocodeResult(status=state, source="nominatim")
        except (URLError, OSError, HTTPTransportError, ValueError, TypeError):
            return ReverseGeocodeResult(status="unavailable", source="nominatim")


@lru_cache(maxsize=1)
def _configured_provider(endpoint, user_agent, allow_public):
    if not endpoint or not user_agent:
        return DisabledGeocoder()
    try:
        return NominatimGeocoder(endpoint, user_agent, allow_public=allow_public)
    except ValueError:
        return DisabledGeocoder()


_configuration_lock = threading.Lock()


def get_geocoder() -> ReverseGeocoder:
    # lru_cache alone may construct twice during simultaneous first requests;
    # guard creation so there is only one rate gate for the active configuration.
    with _configuration_lock:
        return _configured_provider(os.getenv("GEOCODER_URL", "").strip(),
                                    os.getenv("GEOCODER_USER_AGENT", "").strip(),
                                    os.getenv("GEOCODER_ALLOW_PUBLIC_NOMINATIM", "false").lower() == "true")
