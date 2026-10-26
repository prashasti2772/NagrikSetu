import unittest
from app.services.conversation import localized


class ExistingChatLanguageTests(unittest.TestCase):
    def test_all_hindi_guidance_is_real_unicode(self):
        for key in ("draft","missing","created","selection","cancel","help","location","evidence","identity","resolution","reopen","status"):
            with self.subTest(key=key):
                answer,language=localized(key,"English guidance","How do I report?","hi")
                self.assertEqual(language,"hi")
                self.assertRegex(answer,r"[\u0900-\u097f]")
                self.assertNotIn("???",answer)

    def test_explicit_english_selection_wins_over_hindi_input(self):
        answer,language=localized("help","English guidance","शिकायत कैसे करूँ?","en")
        self.assertEqual((answer,language),("English guidance","en"))

    def test_hindi_and_hinglish_auto_detection_remain_distinct(self):
        self.assertEqual(localized("help","English guidance","नमस्ते",None)[1],"hi")
        self.assertEqual(localized("help","English guidance","Meri complaint hai",None)[1],"hi-Latn")
