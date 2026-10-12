# Research basis and editorial decisions

Reviewed on **2026-10-12**. This is an original synthesis of public primary sources,
not a copied style manual or a validated writing benchmark. Sources inform decisions;
their house styles do not become universal rules for every user. No private datasets,
raw transcripts or third-party copy are distributed in this package.

## Writing guidance

| Source | Evidence or guidance used | Decision in this skill | Limit |
| --- | --- | --- | --- |
| [GOV.UK: Use clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | Plain language supports readers with different literacy and language backgrounds, including specialists | Prefer clear syntax and familiar wording without losing exact terms | Government guidance is a service-writing context; it does not rule out literary expression |
| [GOV.UK: Write clear titles](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-titles/) | Titles should identify the subject, match audience language and stand alone | Check the title's job and whether the body fulfills its promise | The site's character convention is not a universal search-display guarantee |
| [GOV.UK: Writing for user interfaces](https://www.gov.uk/service-manual/design/writing-for-user-interfaces) | Direct, contextual labels and help text reduce unnecessary reading; link meaning and reader stress matter | Give controls truthful actions and errors supported recovery; use restraint in serious moments | Copy guidance alone does not verify interface behavior or accessibility conformance |
| [Mailchimp: Voice and tone](https://styleguide.mailchimp.com/voice-and-tone/) | A stable voice can use different tones according to the message and reader's situation | Infer the supplied voice and adapt its tone; avoid forced humor | Mailchimp's own personality is an example, not the default voice for all brands |
| [Mailchimp: Writing for translation](https://styleguide.mailchimp.com/writing-for-translation/) | Cultural formality and clear grammatical relationships matter; some repetition improves translation | Preserve locale, consistent terms and enough connective language | English-oriented translation advice is not a native style guide for every language |
| [Microsoft: Brand voice](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) | Useful information, an early point and conversational wording can support approachable product writing | Prioritize the reader's purpose and recognizable language over performed sophistication | Contractions and warmth are brand choices, not requirements for all human prose |
| [Nielsen Norman Group: Tone dimensions](https://www.nngroup.com/articles/tone-of-voice-dimensions/) | Formality, humor, respect and enthusiasm provide concrete ways to describe tone; the article reports a small user study | Describe voice through observable choices, rather than adjectives alone | Its samples and participants do not establish a universal optimal tone |
| [Nielsen Norman Group: Web-writing study](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/) | The reported studies compare concise, scannable and factual versions with promotional copy | Remove empty promotion and organize practical web copy for finding information | This historical usability evidence does not prove conversion gains or prescribe every long-form genre |
| [W3C WAI: Clear words](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p01-clear-words/) | Familiar vocabulary, explained terms and reduced vagueness can support cognitive accessibility | Keep essential meaning understandable, especially in labels and instructions | This is supplemental guidance, not a standalone WCAG conformance test |

## Research on model writing and its interpretation

### Style involves more than a word list

[Do LLMs write like humans?](https://arxiv.org/html/2410.16107), also published in
[PNAS](https://doi.org/10.1073/pnas.2422455122), compares parallel English text from
human sources and variants of GPT-4o and Llama 3. Its methods, results and discussion
identify differences in grammatical structure, rhetorical style and register, not
just conspicuous vocabulary. Its generalization checks also show limits across
models and corpora.

**Editorial inference:** edit noun piles, sentence movement and genre fit alongside
stock phrasing. Do not present any observed tendency as a defect in all uses, or
extend results from these models to every later model or language. The practical
editing workflow here has not been experimentally validated by that paper.

### Vocabulary evidence has a scale boundary

[Excess vocabulary in biomedical writing](https://arxiv.org/html/2406.07016) studies
changes across PubMed abstracts. Its discussion explicitly limits its inference
to the corpus rather than identifying individual abstracts. Field, language
background and publishing timelines complicate interpretation.

**Editorial inference:** a cluster of inflated style words is a reason to inspect
meaning and fit, not a verdict about authorship. Replacing those words alone does
not repair an unsupported claim or a repetitive argument. Do not copy the study's
marker list into a deterministic banned-word checker.

### Better individual work can still converge on similar ideas

[Creativity and collective diversity](https://arxiv.org/abs/2312.00506), published in
[Science Advances](https://doi.org/10.1126/sciadv.adn5290), reports an experiment in
which access to AI story ideas improved ratings of some individual stories while
the assisted stories became more similar to one another. The author's abstract
was reviewed; this package does not reanalyze the experiment or distribute its data.

**Editorial inference:** use the user's specific material and explore genuinely
different angles when alternatives are requested. The result concerns a bounded
creative-writing task; it does not prove that every assisted text lacks originality.

### Counterevidence matters

[Testing lexical homogenization in English news](https://aclanthology.org/2025.acl-srw.95/)
compares news datasets from 2018 and 2024. The [paper's results and conclusion](https://aclanthology.org/2025.acl-srw.95.pdf)
do not confirm a decrease in lexical diversity under its measurements, despite
an increase in selected model-associated vocabulary. Its discussion notes metric
and genre-transfer limitations.

**Editorial inference:** neither lexical variety nor a fashionable list of
"AI words" is a sufficient writing-quality measure. Avoid claims that all writing
has become homogeneous or that more unusual synonyms make text better.

### Detector performance is not an editorial target

[Detector bias against non-native English writing](https://arxiv.org/html/2304.02819v3),
published in [Patterns](https://doi.org/10.1016/j.patter.2023.100779), examines false
positives in the tested detectors and datasets. The study supports caution about
using detector output to attribute authorship; it is not an assessment of every
current detector.

**Editorial inference:** assess the reader's experience, factual fidelity and voice.
Do not optimize copy for detector scores, label a writer from stylistic clues or
add mistakes and rare words to manufacture an appearance of humanity.

## What this synthesis can and cannot establish

The diagnostic examples, swap/earn/recognize checks and format selection criteria
are editorial tools created for this package. They are not a scientific scoring
system. Reader preference, persuasion and naturalness depend on audience, context,
language and execution; use actual reader feedback when the assignment provides it.
No click-through uplift, detector outcome or cross-model writing quality is claimed.

Refresh the relevant source when a task depends on a changing product, platform or
policy. Reassess the skill after meaningful model changes or observed failures.
Record real behavioral trials separately from structural validation. Source review
dates describe this research checkpoint, not a claim that the sources stay current.
