/* 共用动效入口。原生组件动画由 MDUI 管理；仅负责内容进入和文档滚动。 */

  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var scrolling = null;
  function token(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue('--nekomi-' + name).trim() || fallback;
  }
  function duration(name, fallback) {
    const value = token(name, fallback).trim();
    // Vite minifies 350ms to .35s. WAAPI takes milliseconds, unlike CSS.
    return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  }
  const running = new Set();
  function cancelWithin(root) {
    for (const animation of running) if (root.contains(animation.effect?.target)) animation.cancel();
  }
  function enter(element, distance = 8) {
    if (!element || document.querySelector('[data-reader-motion="false"]') || reduced.matches || !element.getClientRects().length) return;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent.nekomiEntrance?.some(animation => animation.playState === 'running')) return;
    }
    const previous = element.nekomiEntrance?.some(animation => animation.playState === 'running');
    const style = previous ? getComputedStyle(element) : null;
    const from = style ? { transform: style.transform, opacity: style.opacity } : { transform: `translateX(${distance}px)`, opacity: 0 };
    element.nekomiEntrance?.forEach(animation => animation.cancel());
    // Separate spatial movement and opacity so effects never inherit bounce.
    const animations = [
      element.animate([{ transform: from.transform }, { transform: 'translateX(0)' }], {
        duration: duration('spatial-fast-duration', '350ms'), easing: token('spatial-fast-easing', 'cubic-bezier(.42,1.67,.21,.9)'),
      }),
      element.animate([{ opacity: from.opacity }, { opacity: 1 }], {
        duration: duration('effects-default-duration', '200ms'), easing: token('effects-easing', 'cubic-bezier(.34,.8,.34,1)'),
      }),
    ];
    element.nekomiEntrance = animations;
    animations.forEach(animation => {
      running.add(animation);
      animation.finished.then(() => running.delete(animation), () => running.delete(animation));
    });
  }
  function cancelScroll() {
    if (!scrolling) return;
    cancelAnimationFrame(scrolling.frame);
    scrolling = null;
  }
  function destination(element) {
    var offset = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
    return Math.max(0, Math.min(scrollY + element.getBoundingClientRect().top - offset,
      document.documentElement.scrollHeight - innerHeight));
  }
  function scrollToElement(element, animate) {
    cancelScroll();
    if (!element) return;
    if (!animate || reduced.matches || element.closest('[data-reader-motion="false"]')) { window.scrollTo({ top: destination(element), behavior: 'instant' }); return; }
    // 质量 1、刚度 220、阻尼 28：接近临界阻尼，只保留很轻的弹性。
    var state = scrolling = { frame: 0, position: scrollY, velocity: 0, last: 0, start: 0 };
    var stiffness = Number(token('spring-stiffness', '220'));
    var damping = Number(token('spring-damping', '28'));
    function frame(now) {
      if (scrolling !== state) return;
      if (!state.start) state.start = now;
      var target = destination(element);
      var remaining = state.last ? Math.min((now - state.last) / 1000, .032) : 1 / 60;
      state.last = now;
      // 小步积分让低帧率设备保持稳定；只读目标位置并写入滚动位置。
      while (remaining > 0) {
        var step = Math.min(remaining, 1 / 120);
        state.velocity += (stiffness * (target - state.position) - damping * state.velocity) * step;
        state.position += state.velocity * step;
        remaining -= step;
      }
      if (Math.abs(target - state.position) < .5 && Math.abs(state.velocity) < 3 || now - state.start > 2000) {
        window.scrollTo({ top: target, behavior: 'instant' });
        scrolling = null;
        return;
      }
      window.scrollTo({ top: Math.max(0, state.position), behavior: 'instant' });
      state.frame = requestAnimationFrame(frame);
    }
    state.frame = requestAnimationFrame(frame);
  }
  ['wheel', 'touchstart', 'pointerdown'].forEach(function (type) {
    window.addEventListener(type, cancelScroll, { passive: true });
  });
  window.addEventListener('keydown', function (event) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Enter', 'Escape'].includes(event.key)) cancelScroll();
  });
  window.addEventListener('pagehide', cancelScroll);
  reduced.addEventListener('change', function () {
    if (!reduced.matches) return;
    cancelScroll();
    for (const animation of running) animation.cancel();
  });
export const motion = { enter, cancelWithin, scrollTo: scrollToElement, cancelScroll, isScrolling: () => Boolean(scrolling) };
window.NekomiMotion = motion;
