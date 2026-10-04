"""All geocoder calls are injected fakes; never submit coordinates externally."""
import io
import json
import os
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit

import test_backend as legacy
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.core.security import get_current_user
from app.routers import geocoding
from app.schemas.geocoding import ReverseGeocodeRequest, ReverseGeocodeResult
from app.services.geocoding import (DisabledGeocoder, NominatimGeocoder, _NoRedirect,
                                    _configured_provider, get_geocoder)

FIXTURE = {"display_name": "Example civic road", "address": {
    "suburb": "Example locality", "city_district": "Example area", "ward": "Example ward"}}


def response(payload=FIXTURE):
    return io.BytesIO(json.dumps(payload).encode())


class GeocoderUnitTests(unittest.TestCase):
    def setUp(self):
        self.now = [100.0]
        self.location = ReverseGeocodeRequest(latitude=22, longitude=77)
        self.provider = NominatimGeocoder("https://geocoder.example/reverse", "NagrikSetu-tests/1.0",
                                           clock=lambda: self.now[0])

    def test_rest_request_and_explicit_untrusted_mapping(self):
        opener = MagicMock()
        opener.open.return_value = response()
        with patch("app.services.geocoding.build_opener", return_value=opener):
            result = self.provider.reverse(self.location)
        self.assertTrue(result.available)
        self.assertEqual(result.status, "ok")
        self.assertEqual(result.location_text, "Example civic road")
        self.assertEqual(result.locality, "Example locality")
        self.assertEqual(result.area, "Example area")
        self.assertEqual(result.ward, "Example ward")
        self.assertIn("OpenStreetMap", result.attribution)
        self.assertNotIn("department_id", result.model_dump())
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_header("User-agent"), "NagrikSetu-tests/1.0")
        self.assertEqual(request.get_header("Accept"), "application/json")
        self.assertEqual(opener.open.call_args.kwargs, {"timeout": 5})
        self.assertEqual(parse_qs(urlsplit(request.full_url).query), {
            "lat": ["22.0"], "lon": ["77.0"], "format": ["jsonv2"], "addressdetails": ["1"], "layer": ["address"]})

    def test_cache_expiry_bound_and_rate_gate_without_sleep(self):
        provider = NominatimGeocoder("https://geocoder.example/reverse", "NagrikSetu-tests/1.0",
                                     cache_size=1, cache_ttl=10, clock=lambda: self.now[0])
        opener = MagicMock()
        opener.open.side_effect = lambda *args, **kwargs: response()
        other = ReverseGeocodeRequest(latitude=23, longitude=77)
        with patch("app.services.geocoding.build_opener", return_value=opener), patch("time.sleep") as sleep:
            first = provider.reverse(self.location)
            self.assertFalse(first.cached)
            self.assertTrue(provider.reverse(self.location).cached)
            self.assertEqual(provider.reverse(other).status, "rate_limited")
            self.assertEqual(opener.open.call_count, 1)
            self.now[0] += 1
            self.assertTrue(provider.reverse(other).available)
            self.assertEqual(len(provider._cache), 1)
            self.now[0] += 1
            self.assertFalse(provider.reverse(self.location).cached)
            self.now[0] += 11
            self.assertFalse(provider.reverse(self.location).cached)
            self.assertEqual(opener.open.call_count, 4)
            sleep.assert_not_called()

    def test_inflight_requests_do_not_overlap(self):
        opener = MagicMock()
        observed = []
        def in_flight(*args, **kwargs):
            self.now[0] += 2
            observed.append(self.provider.reverse(self.location).status)
            return response()
        opener.open.side_effect = in_flight
        with patch("app.services.geocoding.build_opener", return_value=opener):
            self.assertTrue(self.provider.reverse(self.location).available)
            self.assertTrue(self.provider.reverse(self.location).cached)
        self.assertEqual(observed, ["rate_limited"])
        self.assertEqual(opener.open.call_count, 1)

    def test_network_failure_is_safe_and_negatively_cached(self):
        opener = MagicMock()
        opener.open.side_effect = URLError("untrusted provider diagnostic must not be returned")
        with patch("app.services.geocoding.build_opener", return_value=opener):
            result = self.provider.reverse(self.location)
            self.assertEqual(result.status, "unavailable")
            self.assertFalse(result.available)
            self.assertTrue(self.provider.reverse(self.location).cached)
        self.assertNotIn("diagnostic", result.model_dump_json())
        self.assertEqual(opener.open.call_count, 1)

    def test_http_errors_and_invalid_or_oversized_responses(self):
        cases = [(HTTPError("https://geocoder.example/reverse", 404, "missing", {}, None), "not_found"),
                 (HTTPError("https://geocoder.example/reverse", 429, "limited", {}, None), "rate_limited"),
                 (HTTPError("https://geocoder.example/reverse", 500, "failure", {}, None), "unavailable")]
        for failure, status in cases:
            provider = NominatimGeocoder("https://geocoder.example/reverse", "NagrikSetu-tests/1.0")
            opener = MagicMock()
            opener.open.side_effect = failure
            with patch("app.services.geocoding.build_opener", return_value=opener):
                self.assertEqual(provider.reverse(self.location).status, status)
        for raw, status in [(b"not JSON", "unavailable"), (b"x" * 65537, "unavailable"),
                            (b"[]", "unavailable"), (b'{"error":"no coverage"}', "not_found"),
                            (b'{"address":{"ward":{}}}', "not_found")]:
            provider = NominatimGeocoder("https://geocoder.example/reverse", "NagrikSetu-tests/1.0")
            opener = MagicMock()
            opener.open.return_value = io.BytesIO(raw)
            with patch("app.services.geocoding.build_opener", return_value=opener):
                self.assertEqual(provider.reverse(self.location).status, status)

    def test_does_not_invent_ward_and_limits_provider_text(self):
        opener = MagicMock()
        opener.open.return_value = response({"display_name": "a" * 900,
                                             "address": {"city_district": "Administrative area", "city": "Example city"}})
        with patch("app.services.geocoding.build_opener", return_value=opener):
            result = self.provider.reverse(self.location)
        self.assertIsNone(result.ward)
        self.assertEqual(len(result.location_text), 500)
        self.assertEqual(result.area, "Administrative area")

    def test_config_security_public_opt_in_and_singleton(self):
        for endpoint, ua in [("http://geocoder.example/reverse", "App/1.0"),
                             ("https://user:pass@geocoder.example/reverse", "App/1.0"),
                             ("https://geocoder.example/reverse?key=placeholder", "App/1.0"),
                             ("https://geocoder.example/reverse", ""),
                             ("https://geocoder.example/reverse", "Python-urllib/3.13"),
                             ("https://geocoder.example/reverse", "App\r\nInjected: header")]:
            with self.assertRaises(ValueError):
                NominatimGeocoder(endpoint, ua)
        with self.assertRaises(ValueError):
            NominatimGeocoder("https://nominatim.openstreetmap.org/reverse", "NagrikSetu-tests/1.0")
        with patch("app.services.geocoding.build_opener") as network:
            NominatimGeocoder("https://nominatim.openstreetmap.org/reverse", "NagrikSetu-tests/1.0", allow_public=True)
            with patch.dict(os.environ, {"GEOCODER_URL": "", "GEOCODER_USER_AGENT": ""}):
                self.assertIsInstance(get_geocoder(), DisabledGeocoder)
            with patch.dict(os.environ, {"GEOCODER_URL": "https://geocoder.example/reverse", "GEOCODER_USER_AGENT": "NagrikSetu-tests/1.0"}):
                self.assertIs(get_geocoder(), get_geocoder())
            network.assert_not_called()
        self.assertIsNone(_NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.example"))
        _configured_provider.cache_clear()


class GeocodingApiTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(geocoding.router)
        self.client = TestClient(self.app)
        self.payload = {"latitude": 22, "longitude": 77}

    def tearDown(self):
        self.client.close()

    def test_requires_authentication_before_lookup(self):
        provider = MagicMock()
        self.app.dependency_overrides[get_geocoder] = lambda: provider
        for headers in ({}, {"Authorization": "Bearer invalid"}):
            result = self.client.post("/api/v1/location/reverse", headers=headers, json=self.payload)
            self.assertEqual(result.status_code, 401)
        provider.reverse.assert_not_called()

    def test_authenticated_roles_get_explicit_lookup_and_no_store(self):
        provider = MagicMock()
        provider.reverse.return_value = ReverseGeocodeResult(available=True, status="ok", location_text="Example civic road")
        self.app.dependency_overrides[get_geocoder] = lambda: provider
        for role in ("citizen", "authority", "admin"):
            self.app.dependency_overrides[get_current_user] = lambda: {"role": role}
            result = self.client.post("/api/v1/location/reverse", json=self.payload)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.headers["Cache-Control"], "no-store")
            self.assertEqual(result.json()["location_text"], "Example civic road")
        self.assertEqual(provider.reverse.call_count, 3)

    def test_invalid_coordinates_unknown_fields_and_missing_pair(self):
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "citizen"}
        provider = MagicMock()
        self.app.dependency_overrides[get_geocoder] = lambda: provider
        for changes in ({"latitude": 91}, {"longitude": -181}, {"latitude": "NaN"},
                        {"longitude": "Infinity"}, {"department_id": 1}, {"latitude": None}):
            result = self.client.post("/api/v1/location/reverse", json={**self.payload, **changes})
            self.assertEqual(result.status_code, 422, result.text)
        self.assertEqual(self.client.post("/api/v1/location/reverse", json={"latitude": 22}).status_code, 422)
        provider.reverse.assert_not_called()

    def test_disabled_configuration_is_graceful_and_never_calls_network(self):
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "citizen"}
        with patch.dict(os.environ, {"GEOCODER_URL": "", "GEOCODER_USER_AGENT": ""}), \
             patch("app.services.geocoding.build_opener") as network:
            result = self.client.post("/api/v1/location/reverse", json=self.payload)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertFalse(result.json()["available"])
            self.assertEqual(result.json()["status"], "not_configured")
            network.assert_not_called()


if __name__ == "__main__":
    unittest.main()
