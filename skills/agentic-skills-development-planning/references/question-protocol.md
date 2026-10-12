# Question protocol

Ask one consequential decision at a time after inspection. Explain the desired
outcome, evidence already found, uncertainty, viable options and practical effects.
Use the exact layout in [the skill's question format](../SKILL.md#4-guide-the-engineer-one-question-at-a-time):
bold `Question <number>`, a purpose paragraph containing the decision question,
a paragraph about current code and its evidence-backed rationale, bold `Options`,
the justified recommended option first, alternatives, and a fuller explanation of
why the recommendation fits. Keep blank lines between these parts; do not add the
old numbered subsection headings. Preserve sequential numbering when resuming.

Explain what the current implementation achieves without inventing its historical
reason. Identify missing rationale and distinguish inference from documented intent.
Recommend one option because it fits the repository and stated priorities. Usually
two or three options are enough; do not fabricate a third or ask an irrelevant
question to satisfy the template. Keep simple decisions short, but retain the
closing explanation of why the evidence supports the recommendation and what
would change it.

Accept explicit choices already supplied. Record a custom answer accurately rather
than mapping it to the nearest convenient option. An ambiguous answer about scope,
destructive data or publication needs clarification. Silence does not authorize an
implementation or new permission boundary.

A reversible low-impact implementation detail can follow existing conventions. A
material rule conflict, breaking contract, database transformation or external
publication needs the applicable decision. Permission to save a plan is not
permission to implement it. Permission to implement is not permission to deploy.

After an answer, update affected assumptions and constraints, continue independent
research, and ask only the next unresolved decision. Stop interviewing when the
plan can be concrete. Honour plan-only requests without repeatedly offering execution.
