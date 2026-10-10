# Primary references and boundaries

Documentation checked on **2 October 2026**. These are source-of-truth links for platform behaviour, not bundled third-party skill content. The package's workflows, policies, code and example geometry were authored for this request. No third-party skill repository content is copied into the package.

For a project pinned to an older version, use its matching documentation. The conservative lint policies are the package's engineering choices, not the official SVG or Godot conformance rules.

## Skill format and installation

**S1 — Agent Skills specification.** Frontmatter, folder layout and progressive loading.
https://agentskills.io/specification

**S2 — OpenCode Agent Skills.** User/project discovery paths and permissions.
https://opencode.ai/docs/skills/

**S3 — Official agent-client skill documentation.** Local discovery locations can change; verify the installed client. The Codex documentation URL redirected to the current build-skills guide when checked.
https://developers.openai.com/codex/skills/
https://learn.chatgpt.com/docs/build-skills
https://code.claude.com/docs/en/skills

## SVG and animation behaviour

**S4 — MDN: SVG as an image.** Image-context restrictions and embedding differences.
https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image

**S5 — MDN: SVG animate element.** SVG-native declarative animation and attribute reference.
https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/animate

**S6 — W3C SVG 2 paths.** Path data, subpaths and interpolation-related structure.
https://www.w3.org/TR/SVG2/paths.html

**S7 — MDN: transform-box.** Reference-box behaviour for SVG transforms and transform origins.
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-box

**S8 — MDN: Web Animations and animation enumeration.** Host-controlled effects and the scope of getAnimations.
https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations
https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations

**S9 — SVG animation clocks and Playwright screenshots.** Separate SMIL and CSS/WAAPI timing, and screenshot animation options.
https://developer.mozilla.org/en-US/docs/Web/API/SVGSVGElement/pauseAnimations
https://developer.mozilla.org/en-US/docs/Web/API/SVGSVGElement/setCurrentTime
https://playwright.dev/python/docs/api/class-page

## Accessibility, engines and tooling

**S10 — MDN: prefers-reduced-motion.** Preference detection for tailored motion output.
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

**S11 — W3C WAI: Understanding Pause, Stop, Hide.** Relevant accessibility criteria and context; not a claim of package conformance.
https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html

**S12 — Godot: importing images and SVG resource importer.** Default rasterisation and current DPITexture-related workflows.
https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_images.html
https://docs.godotengine.org/en/stable/classes/class_resourceimportersvg.html

**S13 — SVGO default preset.** Review installed optimiser configuration rather than presuming structural preservation.
https://svgo.dev/docs/preset-default/

**S14 — SVGO prefixIds.** Prefixing behaviour and limitations for predictable identifiers.
https://svgo.dev/docs/plugins/prefixIds/

**S15 — Python XML processing modules.** XML-processing security cautions. The bundled checker is intentionally not a sanitizer.
https://docs.python.org/3/library/xml.html

## What these sources do not establish

They do not certify the generated helper scripts, visual quality, performance on a particular device, app discovery in the user's installation, full WCAG compliance, Godot compatibility for every effect, or skill quality across models. Actual test evidence and gaps are recorded separately in `tests/RESULTS.md`.
