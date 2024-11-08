prompt1 = """Extract ONLY the journalist names that are explicitly written in the newspaper page.
DO NOT infer or guess names. Only return names that you can see word-for-word in the text.

For each exact journalist name found, count:
- Total exclusive articles (marked "EXCLUSIVE")
- Total standard articles (not marked "EXCLUSIVE")

Required format:
{
    "journalist_stats": {
        "Full Name": {
            "exclusive": number,
            "standard": number
        }
    }
}

If unsure about a name, skip it. Only include names you are certain about."""
