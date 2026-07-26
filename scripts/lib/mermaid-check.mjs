/**
 * Mermaid 소스가 실제로 파싱되는지 Node 에서 검사한다.
 * mermaid 는 브라우저 전역을 전제로 하므로 jsdom 으로 최소한의 DOM 을 만들어 준다.
 *
 * jsdom 은 devDependency 이므로, 설치되어 있지 않으면 검사를 건너뛴다
 * (그 경우 사이트에서 렌더링 실패 시 소스를 보여주는 폴백이 동작한다).
 */

let mermaidPromise;

async function loadMermaid() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost/",
  });

  const define = (key, value) =>
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

  define("window", dom.window);
  define("document", dom.window.document);
  define("navigator", dom.window.navigator);
  define("HTMLElement", dom.window.HTMLElement);
  define("SVGElement", dom.window.SVGElement);
  define("Element", dom.window.Element);
  define("Node", dom.window.Node);
  define("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  define("requestAnimationFrame", (cb) => setTimeout(() => cb(Date.now()), 0));
  define("cancelAnimationFrame", (id) => clearTimeout(id));

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base" });
  return mermaid;
}

/** 파싱 가능하면 null, 실패하면 오류 메시지 첫 줄을 돌려준다. 검사 불가 시에도 null. */
export async function checkMermaid(source) {
  try {
    mermaidPromise ??= loadMermaid();
    const mermaid = await mermaidPromise;
    await mermaid.parse(source);
    return null;
  } catch (err) {
    const message = String(err?.message ?? err);
    // jsdom 자체를 못 불러온 경우는 검사 실패로 취급하지 않는다.
    if (message.includes("Cannot find package 'jsdom'") || message.includes("ERR_MODULE_NOT_FOUND")) {
      return null;
    }
    return message.split("\n")[0];
  }
}
