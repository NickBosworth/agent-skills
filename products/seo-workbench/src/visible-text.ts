/** Runs inside the selected browser; bounded text snapshots are not visibility certificates. */
export function visibleTextSnapshots() {
  const page: string[] = [],
    main: string[] = [],
    root = document.body,
    mainRoot = document.querySelector("main");
  let visited = 0,
    pageLength = 0,
    mainLength = 0,
    pageTruncated = false,
    mainTruncated = false;
  if (!root)
    return {
      page: { text: "", truncated: false },
      main: { text: "", truncated: false },
    };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (++visited > 20000) {
      pageTruncated = mainTruncated = true;
      break;
    }
    const node = walker.currentNode,
      content = node.textContent?.replace(/\s+/g, " ").trim();
    if (!content) continue;
    let element = node.parentElement,
      hidden = false,
      navigation = false,
      depth = 0;
    while (element) {
      if (++depth > 100) {
        pageTruncated = mainTruncated = true;
        hidden = true;
        break;
      }
      const style = getComputedStyle(element);
      if (["NAV", "HEADER", "FOOTER", "ASIDE"].includes(element.tagName))
        navigation = true;
      if (
        ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(element.tagName) ||
        element.hasAttribute("hidden") ||
        element.getAttribute("aria-hidden") === "true" ||
        style.display === "none" ||
        ["hidden", "collapse"].includes(style.visibility) ||
        Number(style.opacity) === 0
      ) {
        hidden = true;
        break;
      }
      element = element.parentElement;
    }
    if (hidden) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (
      ![...range.getClientRects()].some(
        (rect) => rect.width > 0 && rect.height > 0,
      )
    )
      continue;
    if (pageLength + content.length + 1 > 500000) pageTruncated = true;
    else {
      page.push(content);
      pageLength += content.length + 1;
    }
    if (!navigation && (!mainRoot || mainRoot.contains(node))) {
      if (mainLength + content.length + 1 > 500000) mainTruncated = true;
      else {
        main.push(content);
        mainLength += content.length + 1;
      }
    }
  }
  return {
    page: { text: page.join(" "), truncated: pageTruncated },
    main: { text: main.join(" "), truncated: mainTruncated },
  };
}
