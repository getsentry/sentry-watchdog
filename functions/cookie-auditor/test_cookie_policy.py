from main import identify_unknown_cookies


KNOWN = {
    "cookies": {
        "sentry-sc/sentry.io": ["https://sentry.io/"],
        "__cf_bm/vimeo.com": ["https://sentry.io/for/nextjs/"],
    },
    "third_party_trackers": {
        "||plausible.io^$third-party": ["https://sentry.zendesk.com/"],
    },
}


def test_known_cookie_is_not_flagged():
    found = {
        "cookies": {
            "sentry-sc/sentry.io": ["https://sentry.io/changelog/"],
        }
    }

    assert identify_unknown_cookies(KNOWN, found) == {}


def test_unknown_cookie_is_flagged_with_its_pages():
    pages = ["https://sentry.io/pricing/"]
    found = {"cookies": {"new-cookie/sentry.io": pages}}

    assert identify_unknown_cookies(KNOWN, found) == {
        "cookies": {"new-cookie/sentry.io": pages}
    }


def test_cloudflare_cookies_are_allowed_on_any_domain():
    found = {
        "cookies": {
            "__cfruid/docs.sentry.io": ["https://docs.sentry.io/"],
            "_cfuvid/blog.sentry.io": ["https://blog.sentry.io/"],
            "cf_clearance/sentry.io": ["https://sentry.io/"],
            "__cf_bm/example.com": ["https://example.com/"],
        }
    }

    assert identify_unknown_cookies(KNOWN, found) == {}


def test_similar_cookie_names_are_not_exempt():
    found = {
        "cookies": {
            "cfruid/sentry.io": ["https://sentry.io/"],
            "cfuvid/sentry.io": ["https://sentry.io/"],
            "cf_bm/sentry.io": ["https://sentry.io/"],
            "__cf_bm_extra/sentry.io": ["https://sentry.io/"],
        }
    }

    unknown = identify_unknown_cookies(KNOWN, found)

    assert set(unknown["cookies"]) == {
        "cfruid/sentry.io",
        "cfuvid/sentry.io",
        "cf_bm/sentry.io",
        "__cf_bm_extra/sentry.io",
    }


def test_other_categories_still_require_an_exact_key():
    found = {
        "third_party_trackers": {
            "||plausible.io^$third-party": ["https://blog.sentry.io/"],
            "||example.com^": ["https://sentry.io/"],
        }
    }

    assert identify_unknown_cookies(KNOWN, found) == {
        "third_party_trackers": {
            "||example.com^": ["https://sentry.io/"],
        }
    }
