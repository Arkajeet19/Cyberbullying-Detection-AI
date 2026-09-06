"""
CyberGuard Community Guidelines -- the knowledge base for the
"explain this flag" RAG feature. Each entry is a short policy passage
describing why a category is treated as harmful, what patterns it
covers, and why context still matters. Written to be genuinely
retrievable content (LangChain chunks and retrieves from this), not
just a lookup table.
"""

POLICY_PASSAGES = {
    "religious_hate": (
        "Religious Hate: Content that demeans, threatens, or promotes discrimination "
        "against individuals or groups on the basis of their religion or religious "
        "practice. This includes attacks on religious identity, mockery of sacred "
        "beliefs intended to degrade rather than critique, and calls to exclude "
        "people from participation because of their faith. Genuine theological "
        "debate or criticism of religious institutions is not, by itself, a "
        "violation -- the distinction is whether the content targets people for "
        "who they are rather than engaging with ideas."
    ),
    "ethnic_hate": (
        "Ethnic Hate: Content that attacks, dehumanizes, or promotes discrimination "
        "against people based on ethnicity, nationality, or race. This covers "
        "slurs, stereotypes presented as fact, and rhetoric suggesting an ethnic "
        "group is inferior, dangerous, or does not belong. Historical or "
        "educational discussion of ethnic conflict is evaluated differently from "
        "content that uses that history to justify present-day hostility."
    ),
    "age_discrimination": (
        "Age Discrimination: Content that demeans or excludes individuals based on "
        "their age, including dismissive generalizations about younger or older "
        "people's competence, worth, or right to participate in a conversation. "
        "Casual references to age are not violations; the concern is language "
        "that uses age as grounds to belittle or dismiss someone."
    ),
    "gender_hate": (
        "Gender Hate: Content that demeans, threatens, or stereotypes individuals "
        "based on gender, including misogynistic or misandrist generalizations, "
        "gatekeeping of who counts as a 'real' member of a gender, and language "
        "that reduces a person's worth to their gender. This is distinct from "
        "discussing gender as a topic; the line is whether real people are being "
        "degraded because of it."
    ),
    "sexual_harassment": (
        "Sexual Harassment: Unwelcome sexual comments, propositions, or content "
        "directed at a specific person, including persistent unwanted advances "
        "after a clear lack of interest, sexualized commentary on someone's body "
        "or appearance without invitation, and threats of a sexual nature. "
        "Consensual conversation between participants who have opted into that "
        "kind of exchange is not covered by this category."
    ),
    "threats": (
        "Threats: Statements expressing intent to cause harm to a person, whether "
        "physical, reputational, or otherwise, including conditional threats "
        "('if you don't... I will...') and threats made to third parties on "
        "someone's behalf. This category is treated with the highest severity "
        "because of the direct risk of real-world harm, and confidence "
        "thresholds for surfacing it are intentionally conservative."
    ),
    "body_shaming": (
        "Body Shaming: Content that mocks, criticizes, or demeans a person's "
        "physical appearance, weight, or body, including unsolicited commentary "
        "framed as 'concern' that is actually intended to humiliate. Neutral "
        "descriptions of appearance are not violations; the concern is language "
        "used to belittle."
    ),
    "political_hate": (
        "Political Hate: Content that dehumanizes or threatens individuals based "
        "on political affiliation, going beyond disagreement or criticism of "
        "policy into personal attacks that frame political opponents as "
        "subhuman or deserving of harm. Robust political debate, including sharp "
        "criticism of ideas and public figures, is not itself a violation."
    ),
    "trolling": (
        "Trolling: Deliberately provocative or disruptive content intended to "
        "derail conversation, provoke an emotional reaction, or waste other "
        "participants' time and goodwill, rather than to communicate a genuine "
        "point. This category is inherently harder to detect than direct insults "
        "because the harm comes from intent and pattern rather than any single "
        "phrase, which is why trolling classifications tend to have more "
        "borderline cases than more direct categories like threats."
    ),
    "mental_hate": (
        "Mental Hate: Content that demeans individuals based on real or perceived "
        "mental health conditions, cognitive ability, or neurodivergence, "
        "including using mental-health terms as insults or suggesting someone's "
        "struggles make them lesser. Genuine, respectful discussion of mental "
        "health topics is not covered by this category."
    ),
    "discrimination": (
        "Discrimination: General content promoting unequal treatment or exclusion "
        "of individuals based on a protected characteristic not covered more "
        "specifically by another category, including gatekeeping of "
        "opportunities, spaces, or belonging based on who someone is rather "
        "than what they've done."
    ),
    "other_cyberbullying_types": (
        "Other Cyberbullying: Harmful content that targets a specific individual "
        "in a way that doesn't fit neatly into the categories above -- this "
        "includes coordinated pile-ons, doxxing threats, humiliation attempts "
        "referencing private information, and other targeted harassment. "
        "Because this category is a catch-all, it tends to have lower precision "
        "than more narrowly defined categories."
    ),
    "not_cyberbullying": (
        "Not Cyberbullying: Content that does not meet the bar for any harmful "
        "category above. Disagreement, criticism, sarcasm without a target, and "
        "ordinary conversation all fall here. The goal of the review process is "
        "to keep this category as the default outcome unless there's a specific, "
        "identifiable pattern matching one of the categories above -- moderation "
        "should be the exception, not the norm."
    ),
}

GENERAL_PRINCIPLES = (
    "General Principles: CyberGuard's classifier assists human moderators; it "
    "does not make final removal decisions on its own. Confidence scores reflect "
    "the model's calibrated estimate of how well a message matches a harmful "
    "category based on patterns learned from labeled training data -- they are "
    "not a certainty of intent, and context the model can't see (tone between "
    "friends, sarcasm, quotation) can produce false positives. Flagged content "
    "stays visible in most cases specifically so a human can make the final call."
)
