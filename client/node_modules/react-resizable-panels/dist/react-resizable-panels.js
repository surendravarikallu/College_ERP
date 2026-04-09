"use client";
import { jsx as ie } from "react/jsx-runtime";
import { useState as re, useCallback as ne, useId as pt, useLayoutEffect as We, useEffect as he, useRef as O, createContext as ht, useImperativeHandle as Ue, useMemo as ye, useSyncExternalStore as Ke, useContext as mt } from "react";
function gt(e, t) {
  const n = getComputedStyle(e), o = parseFloat(n.fontSize);
  return t * o;
}
function yt(e, t) {
  const n = getComputedStyle(e.ownerDocument.body), o = parseFloat(n.fontSize);
  return t * o;
}
function St(e) {
  return e / 100 * window.innerHeight;
}
function vt(e) {
  return e / 100 * window.innerWidth;
}
function zt(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function te({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let o;
  const [i, s] = zt(n);
  switch (s) {
    case "%": {
      o = i / 100 * e;
      break;
    }
    case "px": {
      o = i;
      break;
    }
    case "rem": {
      o = yt(t, i);
      break;
    }
    case "em": {
      o = gt(t, i);
      break;
    }
    case "vh": {
      o = St(i);
      break;
    }
    case "vw": {
      o = vt(i);
      break;
    }
  }
  return o;
}
function T(e) {
  return parseFloat(e.toFixed(3));
}
function Q({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((o, i) => (o += t === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, o), 0);
}
function Se(e) {
  const { panels: t } = e, n = Q({ group: e });
  return n === 0 ? t.map((o) => ({
    groupResizeBehavior: o.panelConstraints.groupResizeBehavior,
    collapsedSize: 0,
    collapsible: o.panelConstraints.collapsible === !0,
    defaultSize: void 0,
    disabled: o.panelConstraints.disabled,
    minSize: 0,
    maxSize: 100,
    panelId: o.id
  })) : t.map((o) => {
    const { element: i, panelConstraints: s } = o;
    let l = 0;
    if (s.collapsedSize !== void 0) {
      const f = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.collapsedSize
      });
      l = T(f / n * 100);
    }
    let r;
    if (s.defaultSize !== void 0) {
      const f = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.defaultSize
      });
      r = T(f / n * 100);
    }
    let a = 0;
    if (s.minSize !== void 0) {
      const f = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.minSize
      });
      a = T(f / n * 100);
    }
    let c = 100;
    if (s.maxSize !== void 0) {
      const f = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.maxSize
      });
      c = T(f / n * 100);
    }
    return {
      groupResizeBehavior: s.groupResizeBehavior,
      collapsedSize: l,
      collapsible: s.collapsible === !0,
      defaultSize: r,
      disabled: s.disabled,
      minSize: a,
      maxSize: c,
      panelId: o.id
    };
  });
}
function C(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function ve(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? bt : xt
  );
}
function bt(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function xt(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Xe(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function qe(e, t) {
  return {
    x: e.x >= t.left && e.x <= t.right ? 0 : Math.min(
      Math.abs(e.x - t.left),
      Math.abs(e.x - t.right)
    ),
    y: e.y >= t.top && e.y <= t.bottom ? 0 : Math.min(
      Math.abs(e.y - t.top),
      Math.abs(e.y - t.bottom)
    )
  };
}
function wt({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const o = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let i, s = Number.MAX_VALUE;
  for (const l of t) {
    const { x: r, y: a } = qe(o, l), c = e === "horizontal" ? r : a;
    c < s && (s = c, i = l);
  }
  return C(i, "No rect found"), i;
}
let ce;
function Pt() {
  return ce === void 0 && (typeof matchMedia == "function" ? ce = !!matchMedia("(pointer:coarse)").matches : ce = !1), ce;
}
function Ye(e) {
  const { element: t, orientation: n, panels: o, separators: i } = e, s = ve(
    n,
    Array.from(t.children).filter(Xe).map((b) => ({ element: b }))
  ).map(({ element: b }) => b), l = [];
  let r = !1, a = !1, c = -1, f = -1, g = 0, d, z = [];
  {
    let b = -1;
    for (const u of s)
      u.hasAttribute("data-panel") && (b++, u.hasAttribute("data-disabled") || (g++, c === -1 && (c = b), f = b));
  }
  if (g > 1) {
    let b = -1;
    for (const u of s)
      if (u.hasAttribute("data-panel")) {
        b++;
        const p = o.find(
          (m) => m.element === u
        );
        if (p) {
          if (d) {
            const m = d.element.getBoundingClientRect(), S = u.getBoundingClientRect();
            let v;
            if (a) {
              const y = n === "horizontal" ? new DOMRect(
                m.right,
                m.top,
                0,
                m.height
              ) : new DOMRect(
                m.left,
                m.bottom,
                m.width,
                0
              ), h = n === "horizontal" ? new DOMRect(S.left, S.top, 0, S.height) : new DOMRect(S.left, S.top, S.width, 0);
              switch (z.length) {
                case 0: {
                  v = [
                    y,
                    h
                  ];
                  break;
                }
                case 1: {
                  const P = z[0], M = wt({
                    orientation: n,
                    rects: [m, S],
                    targetRect: P.element.getBoundingClientRect()
                  });
                  v = [
                    P,
                    M === m ? h : y
                  ];
                  break;
                }
                default: {
                  v = z;
                  break;
                }
              }
            } else
              z.length ? v = z : v = [
                n === "horizontal" ? new DOMRect(
                  m.right,
                  S.top,
                  S.left - m.right,
                  S.height
                ) : new DOMRect(
                  S.left,
                  m.bottom,
                  S.width,
                  S.top - m.bottom
                )
              ];
            for (const y of v) {
              let h = "width" in y ? y : y.element.getBoundingClientRect();
              const P = Pt() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (h.width < P) {
                const L = P - h.width;
                h = new DOMRect(
                  h.x - L / 2,
                  h.y,
                  h.width + L,
                  h.height
                );
              }
              if (h.height < P) {
                const L = P - h.height;
                h = new DOMRect(
                  h.x,
                  h.y - L / 2,
                  h.width,
                  h.height + L
                );
              }
              const M = b <= c || b > f;
              !r && !M && l.push({
                group: e,
                groupSize: Q({ group: e }),
                panels: [d, p],
                separator: "width" in y ? void 0 : y,
                rect: h
              }), r = !1;
            }
          }
          a = !1, d = p, z = [];
        }
      } else if (u.hasAttribute("data-separator")) {
        u.ariaDisabled !== null && (r = !0);
        const p = i.find(
          (m) => m.element === u
        );
        p ? z.push(p) : (d = void 0, z = []);
      } else
        a = !0;
  }
  return l;
}
class Je {
  #e = {};
  addListener(t, n) {
    const o = this.#e[t];
    return o === void 0 ? this.#e[t] = [n] : o.includes(n) || o.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const o = this.#e[t];
    if (o !== void 0)
      if (o.length === 1)
        o[0].call(null, n);
      else {
        let i = !1, s = null;
        const l = Array.from(o);
        for (let r = 0; r < l.length; r++) {
          const a = l[r];
          try {
            a.call(null, n);
          } catch (c) {
            s === null && (i = !0, s = c);
          }
        }
        if (i)
          throw s;
      }
  }
  removeAllListeners() {
    this.#e = {};
  }
  removeListener(t, n) {
    const o = this.#e[t];
    if (o !== void 0) {
      const i = o.indexOf(n);
      i >= 0 && o.splice(i, 1);
    }
  }
}
let A = /* @__PURE__ */ new Map();
const Ze = new Je();
function Lt(e) {
  A = new Map(A), A.delete(e);
}
function Ee(e, t) {
  for (const [n] of A)
    if (n.id === e)
      return n;
}
function j(e, t) {
  for (const [n, o] of A)
    if (n.id === e)
      return o;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function U() {
  return A;
}
function ze(e, t) {
  return Ze.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function _(e, t) {
  const n = A.get(e);
  A = new Map(A), A.set(e, t), Ze.emit("groupChange", {
    group: e,
    prev: n,
    next: t
  });
}
function Ct(e, t, n) {
  let o, i = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const s of t) {
    const l = qe(n, s.rect);
    switch (e) {
      case "horizontal": {
        l.x <= i.x && (o = s, i = l);
        break;
      }
      case "vertical": {
        l.y <= i.y && (o = s, i = l);
        break;
      }
    }
  }
  return o ? {
    distance: i,
    hitRegion: o
  } : void 0;
}
function Rt(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Mt(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: De(e),
    b: De(t)
  };
  let o;
  for (; n.a.at(-1) === n.b.at(-1); )
    o = n.a.pop(), n.b.pop();
  C(
    o,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const i = {
    a: Ie(ke(n.a)),
    b: Ie(ke(n.b))
  };
  if (i.a === i.b) {
    const s = o.childNodes, l = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let r = s.length;
    for (; r--; ) {
      const a = s[r];
      if (a === l.a) return 1;
      if (a === l.b) return -1;
    }
  }
  return Math.sign(i.a - i.b);
}
const Et = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function kt(e) {
  const t = getComputedStyle(Qe(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function It(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || kt(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Et.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function ke(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (C(n, "Missing node"), It(n)) return n;
  }
  return null;
}
function Ie(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function De(e) {
  const t = [];
  for (; e; )
    t.push(e), e = Qe(e);
  return t;
}
function Qe(e) {
  const { parentNode: t } = e;
  return Rt(t) ? t.host : t;
}
function Dt(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function Tt({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Xe(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Mt(n, e) > 0) {
    let o = n;
    for (; o; ) {
      if (o.contains(e))
        return !0;
      if (Dt(o.getBoundingClientRect(), t))
        return !1;
      o = o.parentElement;
    }
  }
  return !0;
}
function be(e, t) {
  const n = [];
  return t.forEach((o, i) => {
    if (i.disabled)
      return;
    const s = Ye(i), l = Ct(i.orientation, s, {
      x: e.clientX,
      y: e.clientY
    });
    l && l.distance.x <= 0 && l.distance.y <= 0 && Tt({
      groupElement: i.element,
      hitRegion: l.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(l.hitRegion);
  }), n;
}
function Ot(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function D(e, t, n = 0) {
  return Math.abs(T(e) - T(t)) <= n;
}
function G(e, t) {
  return D(e, t) ? 0 : e > t ? 1 : -1;
}
function Y({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: o
}) {
  const {
    collapsedSize: i = 0,
    collapsible: s,
    disabled: l,
    maxSize: r = 100,
    minSize: a = 0
  } = t;
  if (l && !e)
    return n;
  if (G(o, a) < 0)
    if (s) {
      const c = (i + a) / 2;
      G(o, c) < 0 ? o = i : o = a;
    } else
      o = a;
  return o = Math.min(r, o), o = T(o), o;
}
function se({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: o,
  prevLayout: i,
  trigger: s
}) {
  if (D(e, 0))
    return t;
  const l = s === "imperative-api", r = Object.values(t), a = Object.values(i), c = [...r], [f, g] = o;
  C(f != null, "Invalid first pivot index"), C(g != null, "Invalid second pivot index");
  let d = 0;
  switch (s) {
    case "keyboard": {
      {
        const u = e < 0 ? g : f, p = n[u];
        C(
          p,
          `Panel constraints not found for index ${u}`
        );
        const {
          collapsedSize: m = 0,
          collapsible: S,
          minSize: v = 0
        } = p;
        if (S) {
          const y = r[u];
          if (C(
            y != null,
            `Previous layout not found for panel index ${u}`
          ), D(y, m)) {
            const h = v - y;
            G(h, Math.abs(e)) > 0 && (e = e < 0 ? 0 - h : h);
          }
        }
      }
      {
        const u = e < 0 ? f : g, p = n[u];
        C(
          p,
          `No panel constraints found for index ${u}`
        );
        const {
          collapsedSize: m = 0,
          collapsible: S,
          minSize: v = 0
        } = p;
        if (S) {
          const y = r[u];
          if (C(
            y != null,
            `Previous layout not found for panel index ${u}`
          ), D(y, v)) {
            const h = y - m;
            G(h, Math.abs(e)) > 0 && (e = e < 0 ? 0 - h : h);
          }
        }
      }
      break;
    }
    default: {
      const u = e < 0 ? g : f, p = n[u];
      C(
        p,
        `Panel constraints not found for index ${u}`
      );
      const m = r[u], { collapsible: S, collapsedSize: v, minSize: y } = p;
      if (S && G(m, y) < 0)
        if (e > 0) {
          const h = y - v, P = h / 2, M = m + e;
          G(M, y) < 0 && (e = G(e, P) <= 0 ? 0 : h);
        } else {
          const h = y - v, P = 100 - h / 2, M = m - e;
          G(M, y) < 0 && (e = G(100 + e, P) > 0 ? 0 : -h);
        }
      break;
    }
  }
  {
    const u = e < 0 ? 1 : -1;
    let p = e < 0 ? g : f, m = 0;
    for (; ; ) {
      const v = r[p];
      C(
        v != null,
        `Previous layout not found for panel index ${p}`
      );
      const h = Y({
        overrideDisabledPanels: l,
        panelConstraints: n[p],
        prevSize: v,
        size: 100
      }) - v;
      if (m += h, p += u, p < 0 || p >= n.length)
        break;
    }
    const S = Math.min(Math.abs(e), Math.abs(m));
    e = e < 0 ? 0 - S : S;
  }
  {
    let p = e < 0 ? f : g;
    for (; p >= 0 && p < n.length; ) {
      const m = Math.abs(e) - Math.abs(d), S = r[p];
      C(
        S != null,
        `Previous layout not found for panel index ${p}`
      );
      const v = S - m, y = Y({
        overrideDisabledPanels: l,
        panelConstraints: n[p],
        prevSize: S,
        size: v
      });
      if (!D(S, y) && (d += S - y, c[p] = y, d.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? p-- : p++;
    }
  }
  if (Ot(a, c))
    return i;
  {
    const u = e < 0 ? g : f, p = r[u];
    C(
      p != null,
      `Previous layout not found for panel index ${u}`
    );
    const m = p + d, S = Y({
      overrideDisabledPanels: l,
      panelConstraints: n[u],
      prevSize: p,
      size: m
    });
    if (c[u] = S, !D(S, m)) {
      let v = m - S, h = e < 0 ? g : f;
      for (; h >= 0 && h < n.length; ) {
        const P = c[h];
        C(
          P != null,
          `Previous layout not found for panel index ${h}`
        );
        const M = P + v, L = Y({
          overrideDisabledPanels: l,
          panelConstraints: n[h],
          prevSize: P,
          size: M
        });
        if (D(P, L) || (v -= L - P, c[h] = L), D(v, 0))
          break;
        e > 0 ? h-- : h++;
      }
    }
  }
  const z = Object.values(c).reduce(
    (u, p) => p + u,
    0
  );
  if (!D(z, 100, 0.1))
    return i;
  const b = Object.keys(i);
  return c.reduce((u, p, m) => (u[b[m]] = p, u), {});
}
function V(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || G(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function B({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), o = [...n], i = o.reduce(
    (r, a) => r + a,
    0
  );
  if (o.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${o.map((r) => `${r}%`).join(", ")}`
    );
  if (!D(i, 100) && o.length > 0)
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      C(a != null, `No layout data found for index ${r}`);
      const c = 100 / i * a;
      o[r] = c;
    }
  let s = 0;
  for (let r = 0; r < t.length; r++) {
    const a = n[r];
    C(a != null, `No layout data found for index ${r}`);
    const c = o[r];
    C(c != null, `No layout data found for index ${r}`);
    const f = Y({
      overrideDisabledPanels: !0,
      panelConstraints: t[r],
      prevSize: a,
      size: c
    });
    c != f && (s += c - f, o[r] = f);
  }
  if (!D(s, 0))
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      C(a != null, `No layout data found for index ${r}`);
      const c = a + s, f = Y({
        overrideDisabledPanels: !0,
        panelConstraints: t[r],
        prevSize: a,
        size: c
      });
      if (a !== f && (s -= f - a, o[r] = f, D(s, 0)))
        break;
    }
  const l = Object.keys(e);
  return o.reduce((r, a, c) => (r[l[c]] = a, r), {});
}
function et({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const r = U();
    for (const [
      a,
      {
        defaultLayoutDeferred: c,
        derivedPanelConstraints: f,
        layout: g,
        groupSize: d,
        separatorToPanels: z
      }
    ] of r)
      if (a.id === e)
        return {
          defaultLayoutDeferred: c,
          derivedPanelConstraints: f,
          group: a,
          groupSize: d,
          layout: g,
          separatorToPanels: z
        };
    throw Error(`Group ${e} not found`);
  }, o = () => {
    const r = n().derivedPanelConstraints.find(
      (a) => a.panelId === t
    );
    if (r !== void 0)
      return r;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, i = () => {
    const r = n().group.panels.find((a) => a.id === t);
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = () => {
    const r = n().layout[t];
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, l = (r) => {
    const a = s();
    if (r === a)
      return;
    const {
      defaultLayoutDeferred: c,
      derivedPanelConstraints: f,
      group: g,
      groupSize: d,
      layout: z,
      separatorToPanels: b
    } = n(), u = g.panels.findIndex((v) => v.id === t), p = u === g.panels.length - 1, m = se({
      delta: p ? a - r : r - a,
      initialLayout: z,
      panelConstraints: f,
      pivotIndices: p ? [u - 1, u] : [u, u + 1],
      prevLayout: z,
      trigger: "imperative-api"
    }), S = B({
      layout: m,
      panelConstraints: f
    });
    V(z, S) || _(g, {
      defaultLayoutDeferred: c,
      derivedPanelConstraints: f,
      groupSize: d,
      layout: S,
      separatorToPanels: b
    });
  };
  return {
    collapse: () => {
      const { collapsible: r, collapsedSize: a } = o(), { mutableValues: c } = i(), f = s();
      r && f !== a && (c.expandToSize = f, l(a));
    },
    expand: () => {
      const { collapsible: r, collapsedSize: a, minSize: c } = o(), { mutableValues: f } = i(), g = s();
      if (r && g === a) {
        let d = f.expandToSize ?? c;
        d === 0 && (d = 1), l(d);
      }
    },
    getSize: () => {
      const { group: r } = n(), a = s(), { element: c } = i(), f = r.orientation === "horizontal" ? c.offsetWidth : c.offsetHeight;
      return {
        asPercentage: a,
        inPixels: f
      };
    },
    isCollapsed: () => {
      const { collapsible: r, collapsedSize: a } = o(), c = s();
      return r && D(a, c);
    },
    resize: (r) => {
      const { group: a } = n(), { element: c } = i(), f = Q({ group: a }), g = te({
        groupSize: f,
        panelElement: c,
        styleProp: r
      }), d = T(g / f * 100);
      l(d);
    }
  };
}
function Te(e) {
  if (e.defaultPrevented)
    return;
  const t = U();
  be(e, t).forEach((o) => {
    if (o.separator && !o.separator.disableDoubleClick) {
      const i = o.panels.find(
        (s) => s.panelConstraints.defaultSize !== void 0
      );
      if (i) {
        const s = i.panelConstraints.defaultSize, l = et({
          groupId: o.group.id,
          panelId: i.id
        });
        l && s !== void 0 && (l.resize(s), e.preventDefault());
      }
    }
  });
}
function de(e) {
  const t = U();
  for (const [n] of t)
    if (n.separators.some(
      (o) => o.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function tt({
  groupId: e
}) {
  const t = () => {
    const n = U();
    for (const [o, i] of n)
      if (o.id === e)
        return { group: o, ...i };
    throw Error(`Could not find Group with id "${e}"`);
  };
  return {
    getLayout() {
      const { defaultLayoutDeferred: n, layout: o } = t();
      return n ? {} : o;
    },
    setLayout(n) {
      const {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        group: s,
        groupSize: l,
        layout: r,
        separatorToPanels: a
      } = t(), c = B({
        layout: n,
        panelConstraints: i
      });
      return o ? r : (V(r, c) || _(s, {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        groupSize: l,
        layout: c,
        separatorToPanels: a
      }), c);
    }
  };
}
function H(e, t) {
  const n = de(e), o = j(n.id, !0), i = n.separators.find(
    (g) => g.element === e
  );
  C(i, "Matching separator not found");
  const s = o.separatorToPanels.get(i);
  C(s, "Matching panels not found");
  const l = s.map((g) => n.panels.indexOf(g)), a = tt({ groupId: n.id }).getLayout(), c = se({
    delta: t,
    initialLayout: a,
    panelConstraints: o.derivedPanelConstraints,
    pivotIndices: l,
    prevLayout: a,
    trigger: "keyboard"
  }), f = B({
    layout: c,
    panelConstraints: o.derivedPanelConstraints
  });
  V(a, f) || _(n, {
    defaultLayoutDeferred: o.defaultLayoutDeferred,
    derivedPanelConstraints: o.derivedPanelConstraints,
    groupSize: o.groupSize,
    layout: f,
    separatorToPanels: o.separatorToPanels
  });
}
function Oe(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = de(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && H(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && H(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && H(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && H(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), H(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const o = de(t), i = j(o.id, !0), { derivedPanelConstraints: s, layout: l, separatorToPanels: r } = i, a = o.separators.find(
          (d) => d.element === t
        );
        C(a, "Matching separator not found");
        const c = r.get(a);
        C(c, "Matching panels not found");
        const f = c[0], g = s.find(
          (d) => d.panelId === f.id
        );
        if (C(g, "Panel metadata not found"), g.collapsible) {
          const d = l[f.id], z = g.collapsedSize === d ? o.mutableState.expandedPanelSizes[f.id] ?? g.minSize : g.collapsedSize;
          H(t, z - d);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const i = de(t).separators.map(
          (a) => a.element
        ), s = Array.from(i).findIndex(
          (a) => a === e.currentTarget
        );
        C(s !== null, "Index not found");
        const l = e.shiftKey ? s > 0 ? s - 1 : i.length - 1 : s + 1 < i.length ? s + 1 : 0;
        i[l].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), H(t, -100);
        break;
      }
    }
}
let J = {
  cursorFlags: 0,
  state: "inactive"
};
const xe = new Je();
function W() {
  return J;
}
function Gt(e) {
  return xe.addListener("change", e);
}
function At(e) {
  const t = J, n = { ...J };
  n.cursorFlags = e, J = n, xe.emit("change", {
    prev: t,
    next: n
  });
}
function Z(e) {
  const t = J;
  J = e, xe.emit("change", {
    prev: t,
    next: e
  });
}
function Ge(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = U(), n = be(e, t), o = /* @__PURE__ */ new Map();
  let i = !1;
  n.forEach((s) => {
    s.separator && (i || (i = !0, s.separator.element.focus({
      preventScroll: !0
    })));
    const l = t.get(s.group);
    l && o.set(s.group, l.layout);
  }), Z({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: o,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
const Nt = (e) => e, ge = () => {
}, nt = 1, ot = 2, it = 4, rt = 8, Ae = 3, Ne = 12;
let fe;
function _e() {
  return fe === void 0 && (fe = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (fe = !0)), fe;
}
function _t({
  cursorFlags: e,
  groups: t,
  state: n
}) {
  let o = 0, i = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((s) => {
        if (!s.mutableState.disableCursor)
          switch (s.orientation) {
            case "horizontal": {
              o++;
              break;
            }
            case "vertical": {
              i++;
              break;
            }
          }
      });
  }
  if (!(o === 0 && i === 0)) {
    switch (n) {
      case "active": {
        if (e && _e()) {
          const s = (e & nt) !== 0, l = (e & ot) !== 0, r = (e & it) !== 0, a = (e & rt) !== 0;
          if (s)
            return r ? "se-resize" : a ? "ne-resize" : "e-resize";
          if (l)
            return r ? "sw-resize" : a ? "nw-resize" : "w-resize";
          if (r)
            return "s-resize";
          if (a)
            return "n-resize";
        }
        break;
      }
    }
    return _e() ? o > 0 && i > 0 ? "move" : o > 0 ? "ew-resize" : "ns-resize" : o > 0 && i > 0 ? "grab" : o > 0 ? "col-resize" : "row-resize";
  }
}
const Fe = /* @__PURE__ */ new WeakMap();
function we(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = Fe.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && e.adoptedStyleSheets.push(n));
  const o = W();
  switch (o.state) {
    case "active":
    case "hover": {
      const i = _t({
        cursorFlags: o.cursorFlags,
        groups: o.hitRegions.map((l) => l.group),
        state: o.state
      }), s = `*, *:hover {cursor: ${i} !important; }`;
      if (t === s)
        return;
      t = s, i ? n.cssRules.length === 0 ? n.insertRule(s) : n.replaceSync(s) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  Fe.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
function st({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: o,
  mountedGroups: i,
  pointerDownAtPoint: s,
  prevCursorFlags: l
}) {
  let r = 0;
  n.forEach((c) => {
    const { group: f, groupSize: g } = c, { orientation: d, panels: z } = f, { disableCursor: b } = f.mutableState;
    let u = 0;
    s ? d === "horizontal" ? u = (t.clientX - s.x) / g * 100 : u = (t.clientY - s.y) / g * 100 : d === "horizontal" ? u = t.clientX < 0 ? -100 : 100 : u = t.clientY < 0 ? -100 : 100;
    const p = o.get(f), m = i.get(f);
    if (!p || !m)
      return;
    const {
      defaultLayoutDeferred: S,
      derivedPanelConstraints: v,
      groupSize: y,
      layout: h,
      separatorToPanels: P
    } = m;
    if (v && h && P) {
      const M = se({
        delta: u,
        initialLayout: p,
        panelConstraints: v,
        pivotIndices: c.panels.map((L) => z.indexOf(L)),
        prevLayout: h,
        trigger: "mouse-or-touch"
      });
      if (V(M, h)) {
        if (u !== 0 && !b)
          switch (d) {
            case "horizontal": {
              r |= u < 0 ? nt : ot;
              break;
            }
            case "vertical": {
              r |= u < 0 ? it : rt;
              break;
            }
          }
      } else
        _(c.group, {
          defaultLayoutDeferred: S,
          derivedPanelConstraints: v,
          groupSize: y,
          layout: M,
          separatorToPanels: P
        });
    }
  });
  let a = 0;
  t.movementX === 0 ? a |= l & Ae : a |= r & Ae, t.movementY === 0 ? a |= l & Ne : a |= r & Ne, At(a), we(e);
}
function $e(e) {
  const t = U(), n = W();
  switch (n.state) {
    case "active":
      st({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function je(e) {
  if (e.defaultPrevented)
    return;
  const t = W(), n = U();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        Z({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((o) => {
          const i = j(o.group.id, !0);
          _(o.group, i);
        });
        return;
      }
      for (const o of t.hitRegions)
        if (o.separator) {
          const { element: i } = o.separator;
          i.hasPointerCapture?.(e.pointerId) || i.setPointerCapture?.(e.pointerId);
        }
      st({
        document: e.currentTarget,
        event: e,
        hitRegions: t.hitRegions,
        initialLayoutMap: t.initialLayoutMap,
        mountedGroups: n,
        pointerDownAtPoint: t.pointerDownAtPoint,
        prevCursorFlags: t.cursorFlags
      });
      break;
    }
    default: {
      const o = be(e, n);
      o.length === 0 ? t.state !== "inactive" && Z({
        cursorFlags: 0,
        state: "inactive"
      }) : Z({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), we(e.currentTarget);
      break;
    }
  }
}
function He(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (W().state) {
      case "hover":
        Z({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Ve(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = W();
  switch (t.state) {
    case "active":
      Z({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (we(e.currentTarget), t.hitRegions.forEach((n) => {
        const o = j(n.group.id, !0);
        _(n.group, o);
      }), e.preventDefault());
  }
}
function Be(e) {
  let t = 0, n = 0;
  const o = {};
  for (const s of e)
    if (s.defaultSize !== void 0) {
      t++;
      const l = T(s.defaultSize);
      n += l, o[s.panelId] = l;
    } else
      o[s.panelId] = void 0;
  const i = e.length - t;
  if (i !== 0) {
    const s = T((100 - n) / i);
    for (const l of e)
      l.defaultSize === void 0 && (o[l.panelId] = s);
  }
  return o;
}
function Ft(e, t, n) {
  if (!n[0])
    return;
  const i = e.panels.find((c) => c.element === t);
  if (!i || !i.onResize)
    return;
  const s = Q({ group: e }), l = e.orientation === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, r = i.mutableValues.prevSize, a = {
    asPercentage: T(l / s * 100),
    inPixels: l
  };
  i.mutableValues.prevSize = a, i.onResize(a, i.id, r);
}
function $t(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const o in e)
    if (e[o] !== t[o])
      return !1;
  return !0;
}
function jt({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: o
}) {
  if (n <= 0 || t <= 0 || n === t)
    return o;
  let i = 0, s = 0, l = !1;
  const r = /* @__PURE__ */ new Map(), a = [];
  for (const g of e.panels) {
    const d = o[g.id] ?? 0;
    switch (g.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        l = !0;
        const z = d / 100 * n, b = T(
          z / t * 100
        );
        r.set(g.id, b), i += b;
        break;
      }
      case "preserve-relative-size":
      default: {
        a.push(g.id), s += d;
        break;
      }
    }
  }
  if (!l || a.length === 0)
    return o;
  const c = 100 - i, f = { ...o };
  if (r.forEach((g, d) => {
    f[d] = g;
  }), s > 0)
    for (const g of a) {
      const d = o[g] ?? 0;
      f[g] = T(
        d / s * c
      );
    }
  else {
    const g = T(
      c / a.length
    );
    for (const d of a)
      f[d] = g;
  }
  return f;
}
function Ht(e, t) {
  const n = e.map((i) => i.id), o = Object.keys(t);
  if (n.length !== o.length)
    return !1;
  for (const i of n)
    if (!o.includes(i))
      return !1;
  return !0;
}
const q = /* @__PURE__ */ new Map();
function Vt(e) {
  let t = !0;
  C(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), s = new n((u) => {
    for (const p of u) {
      const { borderBoxSize: m, target: S } = p;
      if (S === e.element) {
        if (t) {
          const v = Q({ group: e });
          if (v === 0)
            return;
          const y = j(e.id);
          if (!y)
            return;
          const h = Se(e), P = y.defaultLayoutDeferred ? Be(h) : y.layout, M = jt({
            group: e,
            nextGroupSize: v,
            prevGroupSize: y.groupSize,
            prevLayout: P
          }), L = B({
            layout: M,
            panelConstraints: h
          });
          if (!y.defaultLayoutDeferred && V(y.layout, L) && $t(
            y.derivedPanelConstraints,
            h
          ) && y.groupSize === v)
            return;
          _(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: h,
            groupSize: v,
            layout: L,
            separatorToPanels: y.separatorToPanels
          });
        }
      } else
        Ft(e, S, m);
    }
  });
  s.observe(e.element), e.panels.forEach((u) => {
    C(
      !o.has(u.id),
      `Panel ids must be unique; id "${u.id}" was used more than once`
    ), o.add(u.id), u.onResize && s.observe(u.element);
  });
  const l = Q({ group: e }), r = Se(e), a = e.panels.map(({ id: u }) => u).join(",");
  let c = e.mutableState.defaultLayout;
  c && (Ht(e.panels, c) || (c = void 0));
  const f = e.mutableState.layouts[a] ?? c ?? Be(r), g = B({
    layout: f,
    panelConstraints: r
  }), d = e.element.ownerDocument;
  q.set(
    d,
    (q.get(d) ?? 0) + 1
  );
  const z = /* @__PURE__ */ new Map();
  return Ye(e).forEach((u) => {
    u.separator && z.set(u.separator, u.panels);
  }), _(e, {
    defaultLayoutDeferred: l === 0,
    derivedPanelConstraints: r,
    groupSize: l,
    layout: g,
    separatorToPanels: z
  }), e.separators.forEach((u) => {
    C(
      !i.has(u.id),
      `Separator ids must be unique; id "${u.id}" was used more than once`
    ), i.add(u.id), u.element.addEventListener("keydown", Oe);
  }), q.get(d) === 1 && (d.addEventListener("dblclick", Te, !0), d.addEventListener("pointerdown", Ge, !0), d.addEventListener("pointerleave", $e), d.addEventListener("pointermove", je), d.addEventListener("pointerout", He), d.addEventListener("pointerup", Ve, !0)), function() {
    t = !1, q.set(
      d,
      Math.max(0, (q.get(d) ?? 0) - 1)
    ), Lt(e), e.separators.forEach((p) => {
      p.element.removeEventListener("keydown", Oe);
    }), q.get(d) || (d.removeEventListener(
      "dblclick",
      Te,
      !0
    ), d.removeEventListener(
      "pointerdown",
      Ge,
      !0
    ), d.removeEventListener("pointerleave", $e), d.removeEventListener("pointermove", je), d.removeEventListener("pointerout", He), d.removeEventListener("pointerup", Ve, !0)), s.disconnect();
  };
}
function Bt() {
  const [e, t] = re({}), n = ne(() => t({}), []);
  return [e, n];
}
function Pe(e) {
  const t = pt();
  return `${e ?? t}`;
}
const K = typeof window < "u" ? We : he;
function oe(e) {
  const t = O(e);
  return K(() => {
    t.current = e;
  }, [e]), ne(
    (...n) => t.current?.(...n),
    [t]
  );
}
function Le(...e) {
  return oe((t) => {
    e.forEach((n) => {
      if (n)
        switch (typeof n) {
          case "function": {
            n(t);
            break;
          }
          case "object": {
            n.current = t;
            break;
          }
        }
    });
  });
}
function Ce(e) {
  const t = O({ ...e });
  return K(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const at = ht(null);
function Wt(e, t) {
  const n = O({
    getLayout: () => ({}),
    setLayout: Nt
  });
  Ue(t, () => n.current, []), K(() => {
    Object.assign(
      n.current,
      tt({ groupId: e })
    );
  });
}
function Ut({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: o,
  disabled: i,
  elementRef: s,
  groupRef: l,
  id: r,
  onLayoutChange: a,
  onLayoutChanged: c,
  orientation: f = "horizontal",
  resizeTargetMinimumSize: g = {
    coarse: 20,
    fine: 10
  },
  style: d,
  ...z
}) {
  const b = O({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), u = oe((x) => {
    V(b.current.onLayoutChange, x) || (b.current.onLayoutChange = x, a?.(x));
  }), p = oe((x) => {
    V(b.current.onLayoutChanged, x) || (b.current.onLayoutChanged = x, c?.(x));
  }), m = Pe(r), S = O(null), [v, y] = Bt(), h = O({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: g,
    separators: []
  }), P = Le(S, s);
  Wt(m, l);
  const M = oe(
    (x, w) => {
      const E = W(), R = Ee(x), k = j(x);
      if (k) {
        let I = !1;
        switch (E.state) {
          case "active": {
            I = E.hitRegions.some(
              ($) => $.group === R
            );
            break;
          }
        }
        return {
          flexGrow: k.layout[w] ?? 1,
          pointerEvents: I ? "none" : void 0
        };
      }
      if (n?.[w])
        return {
          flexGrow: n?.[w]
        };
    }
  ), L = Ce({
    defaultLayout: n,
    disableCursor: o
  }), X = ye(
    () => ({
      get disableCursor() {
        return !!L.disableCursor;
      },
      getPanelStyles: M,
      id: m,
      orientation: f,
      registerPanel: (x) => {
        const w = h.current;
        return w.panels = ve(f, [
          ...w.panels,
          x
        ]), y(), () => {
          w.panels = w.panels.filter(
            (E) => E !== x
          ), y();
        };
      },
      registerSeparator: (x) => {
        const w = h.current;
        return w.separators = ve(f, [
          ...w.separators,
          x
        ]), y(), () => {
          w.separators = w.separators.filter(
            (E) => E !== x
          ), y();
        };
      },
      updatePanelProps: (x, { disabled: w }) => {
        const R = h.current.panels.find(
          ($) => $.id === x
        );
        R && (R.panelConstraints.disabled = w);
        const k = Ee(m), I = j(m);
        k && I && _(k, {
          ...I,
          derivedPanelConstraints: Se(k)
        });
      },
      updateSeparatorProps: (x, {
        disabled: w,
        disableDoubleClick: E
      }) => {
        const k = h.current.separators.find(
          (I) => I.id === x
        );
        k && (k.disabled = w, k.disableDoubleClick = E);
      }
    }),
    [M, m, y, f, L]
  ), F = O(null);
  return K(() => {
    const x = S.current;
    if (x === null)
      return;
    const w = h.current;
    let E;
    if (L.defaultLayout !== void 0 && Object.keys(L.defaultLayout).length === w.panels.length) {
      E = {};
      for (const ee of w.panels) {
        const le = L.defaultLayout[ee.id];
        le !== void 0 && (E[ee.id] = le);
      }
    }
    const R = {
      disabled: !!i,
      element: x,
      id: m,
      mutableState: {
        defaultLayout: E,
        disableCursor: !!L.disableCursor,
        expandedPanelSizes: h.current.lastExpandedPanelSizes,
        layouts: h.current.layouts
      },
      orientation: f,
      panels: w.panels,
      resizeTargetMinimumSize: w.resizeTargetMinimumSize,
      separators: w.separators
    };
    F.current = R;
    const k = Vt(R), { defaultLayoutDeferred: I, derivedPanelConstraints: $, layout: ae } = j(R.id, !0);
    !I && $.length > 0 && (u(ae), p(ae));
    const lt = ze(m, (ee) => {
      const { defaultLayoutDeferred: le, derivedPanelConstraints: Me, layout: ue } = ee.next;
      if (le || Me.length === 0)
        return;
      const ut = R.panels.map(({ id: N }) => N).join(",");
      R.mutableState.layouts[ut] = ue, Me.forEach((N) => {
        if (N.collapsible) {
          const { layout: me } = ee.prev ?? {};
          if (me) {
            const ft = D(
              N.collapsedSize,
              ue[N.panelId]
            ), dt = D(
              N.collapsedSize,
              me[N.panelId]
            );
            ft && !dt && (R.mutableState.expandedPanelSizes[N.panelId] = me[N.panelId]);
          }
        }
      });
      const ct = W().state !== "active";
      u(ue), ct && p(ue);
    });
    return () => {
      F.current = null, k(), lt();
    };
  }, [
    i,
    m,
    p,
    u,
    f,
    v,
    L
  ]), he(() => {
    const x = F.current;
    x && (x.mutableState.defaultLayout = n, x.mutableState.disableCursor = !!o);
  }), /* @__PURE__ */ ie(at.Provider, { value: X, children: /* @__PURE__ */ ie(
    "div",
    {
      ...z,
      className: t,
      "data-group": !0,
      "data-testid": m,
      id: m,
      ref: P,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...d,
        display: "flex",
        flexDirection: f === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: f === "horizontal" ? "pan-y" : "pan-x"
      },
      children: e
    }
  ) });
}
Ut.displayName = "Group";
function pe(e, t) {
  return `react-resizable-panels:${[e, ...t].join(":")}`;
}
function Kt({
  id: e,
  panelIds: t,
  storage: n
}) {
  const o = pe(e, []), i = n.getItem(o);
  if (i)
    try {
      const s = JSON.parse(i);
      if (t) {
        const l = t.join(","), r = s[l];
        if (r && Array.isArray(r.layout) && t.length === r.layout.length) {
          const a = {};
          for (let c = 0; c < t.length; c++)
            a[t[c]] = r.layout[c];
          return a;
        }
      } else {
        const l = Object.keys(s);
        if (l.length === 1) {
          const r = s[l[0]];
          if (r && Array.isArray(r.layout)) {
            const a = l[0].split(",");
            if (a.length === r.layout.length) {
              const c = {};
              for (let f = 0; f < a.length; f++)
                c[a[f]] = r.layout[f];
              return c;
            }
          }
        }
      }
    } catch {
    }
}
function on({
  debounceSaveMs: e = 100,
  panelIds: t,
  storage: n = localStorage,
  ...o
}) {
  const i = t !== void 0, s = "id" in o ? o.id : o.groupId, l = pe(s, t ?? []), r = Ke(
    Xt,
    () => n.getItem(l),
    () => n.getItem(l)
  ), a = ye(() => {
    if (r) {
      const u = JSON.parse(r), p = Object.values(u);
      if (Array.from(p).every((m) => typeof m == "number"))
        return u;
    }
  }, [r]), c = ye(() => {
    if (!a)
      return Kt({
        id: s,
        panelIds: t,
        storage: n
      });
  }, [a, s, t, n]), f = a ?? c, g = O(null), d = ne(() => {
    const u = g.current;
    u && (g.current = null, clearTimeout(u));
  }, []);
  We(() => () => {
    d();
  }, [d]);
  const z = ne(
    (u) => {
      d();
      let p;
      i ? p = pe(s, Object.keys(u)) : p = pe(s, []);
      try {
        n.setItem(p, JSON.stringify(u));
      } catch (m) {
        console.error(m);
      }
    },
    [d, i, s, n]
  ), b = ne(
    (u) => {
      d(), e === 0 ? z(u) : g.current = setTimeout(() => {
        z(u);
      }, e);
    },
    [d, e, z]
  );
  return {
    /**
     * Pass this value to `Group` as the `defaultLayout` prop.
     */
    defaultLayout: f,
    /**
     * Attach this callback on the `Group` as the `onLayoutChange` prop.
     *
     * @deprecated Use the {@link onLayoutChanged} prop instead.
     */
    onLayoutChange: b,
    /**
     * Attach this callback on the `Group` as the `onLayoutChanged` prop.
     */
    onLayoutChanged: z
  };
}
function Xt() {
  return function() {
  };
}
function rn() {
  return re(null);
}
function sn() {
  return O(null);
}
function Re() {
  const e = mt(at);
  return C(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function qt(e, t) {
  const { id: n } = Re(), o = O({
    collapse: ge,
    expand: ge,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: ge
  });
  Ue(t, () => o.current, []), K(() => {
    Object.assign(
      o.current,
      et({ groupId: n, panelId: e })
    );
  });
}
function Yt({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: o = !1,
  defaultSize: i,
  disabled: s,
  elementRef: l,
  groupResizeBehavior: r = "preserve-relative-size",
  id: a,
  maxSize: c = "100%",
  minSize: f = "0%",
  onResize: g,
  panelRef: d,
  style: z,
  ...b
}) {
  const u = !!a, p = Pe(a), m = Ce({
    disabled: s
  }), S = O(null), v = Le(S, l), {
    getPanelStyles: y,
    id: h,
    orientation: P,
    registerPanel: M,
    updatePanelProps: L
  } = Re(), X = g !== null, F = oe(
    (R, k, I) => {
      g?.(R, a, I);
    }
  );
  K(() => {
    const R = S.current;
    if (R !== null) {
      const k = {
        element: R,
        id: p,
        idIsStable: u,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: X ? F : void 0,
        panelConstraints: {
          groupResizeBehavior: r,
          collapsedSize: n,
          collapsible: o,
          defaultSize: i,
          disabled: m.disabled,
          maxSize: c,
          minSize: f
        }
      };
      return M(k);
    }
  }, [
    r,
    n,
    o,
    i,
    X,
    p,
    u,
    c,
    f,
    F,
    M,
    m
  ]), he(() => {
    L(p, { disabled: s });
  }, [s, p, L]), qt(p, d);
  const x = () => {
    const R = y(h, p);
    if (R)
      return JSON.stringify(R);
  }, w = Ke(
    (R) => ze(h, R),
    x,
    x
  );
  let E;
  return w ? E = JSON.parse(w) : i ? E = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: i
  } : E = { flexGrow: 1 }, /* @__PURE__ */ ie(
    "div",
    {
      ...b,
      "data-disabled": s || void 0,
      "data-panel": !0,
      "data-testid": p,
      id: p,
      ref: v,
      style: {
        ...Jt,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...E
      },
      children: /* @__PURE__ */ ie(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...z,
            // Inform the browser that the library is handling touch events for this element
            // but still allow users to scroll content within panels in the non-resizing direction
            // NOTE This is not an inherited style
            // See github.com/bvaughn/react-resizable-panels/issues/662
            touchAction: P === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
Yt.displayName = "Panel";
const Jt = {
  minHeight: 0,
  maxHeight: "100%",
  height: "auto",
  minWidth: 0,
  maxWidth: "100%",
  width: "auto",
  border: "none",
  borderWidth: 0,
  padding: 0,
  margin: 0
};
function an() {
  return re(null);
}
function ln() {
  return O(null);
}
function Zt({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: o
}) {
  let i, s;
  const l = e[n], r = t.find(
    (a) => a.panelId === n
  );
  if (r) {
    const a = r.maxSize, c = r.collapsible ? r.collapsedSize : r.minSize, f = [o, o + 1];
    s = B({
      layout: se({
        delta: c - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: f,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], i = B({
      layout: se({
        delta: a - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: f,
        prevLayout: e
      }),
      panelConstraints: t
    })[n];
  }
  return {
    valueControls: n,
    valueMax: i,
    valueMin: s,
    valueNow: l
  };
}
function Qt({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: o,
  elementRef: i,
  id: s,
  style: l,
  ...r
}) {
  const a = Pe(s), c = Ce({
    disabled: n,
    disableDoubleClick: o
  }), [f, g] = re({}), [d, z] = re("inactive"), b = O(null), u = Le(b, i), {
    disableCursor: p,
    id: m,
    orientation: S,
    registerSeparator: v,
    updateSeparatorProps: y
  } = Re(), h = S === "horizontal" ? "vertical" : "horizontal";
  K(() => {
    const M = b.current;
    if (M !== null) {
      const L = {
        disabled: c.disabled,
        disableDoubleClick: c.disableDoubleClick,
        element: M,
        id: a
      }, X = v(L), F = Gt(
        (w) => {
          z(
            w.next.state !== "inactive" && w.next.hitRegions.some(
              (E) => E.separator === L
            ) ? w.next.state : "inactive"
          );
        }
      ), x = ze(
        m,
        (w) => {
          const { derivedPanelConstraints: E, layout: R, separatorToPanels: k } = w.next, I = k.get(L);
          if (I) {
            const $ = I[0], ae = I.indexOf($);
            g(
              Zt({
                layout: R,
                panelConstraints: E,
                panelId: $.id,
                panelIndex: ae
              })
            );
          }
        }
      );
      return () => {
        F(), x(), X();
      };
    }
  }, [m, a, v, c]), he(() => {
    y(a, { disabled: n, disableDoubleClick: o });
  }, [n, o, a, y]);
  let P;
  return n && !p && (P = "not-allowed"), /* @__PURE__ */ ie(
    "div",
    {
      ...r,
      "aria-controls": f.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": h,
      "aria-valuemax": f.valueMax,
      "aria-valuemin": f.valueMin,
      "aria-valuenow": f.valueNow,
      children: e,
      className: t,
      "data-separator": n ? "disabled" : d,
      "data-testid": a,
      id: a,
      ref: u,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: P,
        ...l,
        flexGrow: 0,
        flexShrink: 0,
        // Inform the browser that the library is handling touch events for this element
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: "none"
      },
      tabIndex: n ? void 0 : 0
    }
  );
}
Qt.displayName = "Separator";
export {
  Ut as Group,
  Yt as Panel,
  Qt as Separator,
  Pt as isCoarsePointer,
  on as useDefaultLayout,
  rn as useGroupCallbackRef,
  sn as useGroupRef,
  an as usePanelCallbackRef,
  ln as usePanelRef
};
//# sourceMappingURL=react-resizable-panels.js.map
