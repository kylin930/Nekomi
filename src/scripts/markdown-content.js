export function initMarkdownContent(body, signal) {
  for (const video of body.querySelectorAll('[data-md-video]')) {
    const button = video.querySelector('[data-video-load]'),
      status = video.querySelector('p');
    let frame;
    const close = () => {
      frame?.remove();
      frame = undefined;
      button.textContent =
        '加载 ' +
        (video.dataset.mdVideo === 'youtube' ? 'YouTube' : 'Bilibili') +
        ' 视频';
    };
    button.hidden = false;
    button.addEventListener(
      'click',
      () => {
        if (frame) {
          close();
          return;
        }
        const youtube = video.dataset.mdVideo === 'youtube';
        const url = new URL(
          youtube
            ? 'https://www.youtube-nocookie.com/embed/' + video.dataset.videoId
            : 'https://player.bilibili.com/player.html',
        );
        url.search = youtube
          ? 'rel=0'
          : new URLSearchParams({
              bvid: video.dataset.videoId,
              autoplay: '0',
            }).toString();
        frame = document.createElement('iframe');
        frame.src = url.href;
        frame.title = video.querySelector('figcaption').textContent;
        frame.className = 'md-video-frame';
        frame.allowFullscreen = true;
        frame.allow = 'fullscreen; picture-in-picture; encrypted-media';
        frame.setAttribute(
          'sandbox',
          'allow-scripts allow-same-origin allow-presentation allow-popups',
        );
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.addEventListener(
          'error',
          () => {
            if (!signal.aborted) {
              close();
              status.textContent = '播放器无法加载，请通过原站链接打开。';
            }
          },
          { once: true, signal },
        );
        video.insertBefore(frame, status);
        button.textContent = '关闭播放器';
      },
      { signal },
    );
    signal.addEventListener('abort', close, { once: true });
  }
}
