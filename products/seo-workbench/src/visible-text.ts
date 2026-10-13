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
  const pending: Node[] = [root];
  while (pending.length) {
    if (++visited > 20000) {
      pageTruncated = mainTruncated = true;
      break;
    }
    const node = pending.pop()!;
    if (node.nodeType !== Node.TEXT_NODE) {
      const children =
        node instanceof HTMLSlotElement
          ? node.assignedNodes({ flatten: true }).length
            ? node.assignedNodes({ flatten: true })
            : node.childNodes
          : node instanceof Element && node.shadowRoot
            ? node.shadowRoot.childNodes
            : node.childNodes;
      const allowance = Math.max(0, 20000 - visited - pending.length);
      if (children.length > allowance) pageTruncated = mainTruncated = true;
      for (let i = Math.min(children.length, allowance) - 1; i >= 0; i--)
        pending.push(children[i]);
      continue;
    }
    const content = node.textContent?.replace(/\s+/g, " ").trim();
    if (!content) continue;
    const nodeTree = node.getRootNode();
    let element: Element | null =
        (node as Text).assignedSlot ??
        node.parentElement ??
        (nodeTree instanceof ShadowRoot ? nodeTree.host : null),
      hidden = false,
      navigation = false,
      inMain = false,
      depth = 0;
    while (element) {
      if (++depth > 100) {
        pageTruncated = mainTruncated = true;
        hidden = true;
        break;
      }
      const style = getComputedStyle(element);
      if (element === mainRoot || (!mainRoot && element.tagName === "MAIN"))
        inMain = true;
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
      const tree = element.getRootNode();
      element =
        element.assignedSlot ??
        element.parentElement ??
        (tree instanceof ShadowRoot ? tree.host : null);
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
    if (!navigation && (!mainRoot || inMain)) {
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
