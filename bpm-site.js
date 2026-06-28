/* BPM shared navigation + TTS audio (matches epaprep.pages.dev behaviour) */
(function () {
  'use strict';

  var I_PLAY = '\u25B6';
  var I_PAUSE = '\u23F8';
  var SPEED_KEY = 'bpm-audio-rate';
  var VALID_RATES = [1, 1.25, 1.5, 1.75, 2];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function storageOK() {
    try {
      localStorage.setItem('_bpm_t', '1');
      localStorage.removeItem('_bpm_t');
      return true;
    } catch (e) {
      return false;
    }
  }

  function getStoredRate() {
    if (!storageOK()) return 1;
    var r = parseFloat(localStorage.getItem(SPEED_KEY));
    return VALID_RATES.indexOf(r) >= 0 ? r : 1;
  }

  function setStoredRate(rate) {
    if (storageOK()) localStorage.setItem(SPEED_KEY, String(rate));
  }

  function cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function extractSectionText(root) {
    if (!root) return '';
    var clone = root.cloneNode(true);
    clone.querySelectorAll(
      'button, select, input, textarea, .answers-toolbar, .answers-note, .flashcard-hint, .flashcard-back, .bpm-minimise-btn, .bpm-play-section-btn, .bpm-section-close-btn, .toc-container, script, style'
    ).forEach(function (el) { el.remove(); });
    var txt = cleanText(clone.textContent || '');
    return txt.length > 6000 ? txt.substring(0, 6000) + '.' : txt;
  }

  function bindInteractive(btn, handler) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    });
  }

  function initSpeedButtons(setRate) {
    var rate = getStoredRate();
    setRate(rate);
    $$('.bpm-speed-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseFloat(btn.dataset.rate) === rate);
      btn.addEventListener('click', function () {
        var chosen = parseFloat(btn.dataset.rate);
        setStoredRate(chosen);
        setRate(chosen);
        $$('.bpm-speed-btn').forEach(function (b) {
          b.classList.toggle('active', parseFloat(b.dataset.rate) === chosen);
        });
      });
    });
  }

  function createAudioEngine(opts) {
    var synth = window.speechSynthesis;
    var sections = opts.sections;
    var mainLabel = opts.mainLabel;
    var currentRate = 1;
    var currentSec = null;
    var playAllActive = false;
    var playAllIndex = 0;
    var isPaused = false;
    var gen = 0;

    var mainBtn = $('#bpm-btn-play-main');
    var stopBtn = $('#bpm-btn-stop');
    var progressEl = $('#bpm-audio-progress');

    function sectionText(sec) {
      var body = sec.getText ? sec.getText() : extractSectionText(sec.el);
      return cleanText((sec.title ? sec.title + '. ' : '') + body);
    }

    function updateUI() {
      var active = !!currentSec;
      if (stopBtn) stopBtn.disabled = !active;

      if (mainBtn) {
        if (!active) {
          mainBtn.innerHTML = I_PLAY + ' ' + mainLabel;
          mainBtn.setAttribute('aria-label', mainLabel);
        } else if (playAllActive && !isPaused) {
          mainBtn.innerHTML = I_PAUSE + ' Pause';
          mainBtn.setAttribute('aria-label', 'Pause');
        } else if (playAllActive && isPaused) {
          mainBtn.innerHTML = I_PLAY + ' Resume';
          mainBtn.setAttribute('aria-label', 'Resume');
        } else {
          mainBtn.innerHTML = I_PLAY + ' ' + mainLabel;
          mainBtn.setAttribute('aria-label', mainLabel);
        }
      }

      if (progressEl) {
        if (!active) {
          progressEl.textContent = '';
        } else {
          var idx = sections.indexOf(currentSec);
          var loc = playAllActive && idx >= 0
            ? 'Section ' + (idx + 1) + ' of ' + sections.length
            : currentSec.title;
          progressEl.textContent = (isPaused ? 'Paused: ' : 'Playing: ') + loc;
        }
      }

      sections.forEach(function (sec) {
        if (!sec.playBtn) return;
        if (currentSec === sec) {
          sec.playBtn.innerHTML = (isPaused ? I_PLAY + ' Resume' : I_PAUSE + ' Pause');
          sec.playBtn.classList.add('bpm-btn-active');
          if (sec.el) sec.el.classList.add('bpm-section-playing');
        } else {
          sec.playBtn.innerHTML = I_PLAY + ' Play Section';
          sec.playBtn.classList.remove('bpm-btn-active');
          if (sec.el) sec.el.classList.remove('bpm-section-playing');
        }
      });
    }

    function stopAll() {
      playAllActive = false;
      isPaused = false;
      currentSec = null;
      playAllIndex = 0;
      gen++;
      try {
        if (synth.paused) synth.resume();
      } catch (e) {}
      synth.cancel();
      updateUI();
    }

    function speakText(text, onEnd) {
      gen++;
      var myGen = gen;
      isPaused = false;
      try {
        if (synth.paused) synth.resume();
      } catch (e) {}
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = currentRate;
      u.onend = function () {
        if (myGen !== gen) return;
        if (onEnd) onEnd();
      };
      u.onerror = function (e) {
        if (myGen !== gen || e.error === 'interrupted') return;
        if (onEnd) onEnd();
      };
      synth.speak(u);
    }

    function pauseResume() {
      if (!currentSec) return;
      if (isPaused) {
        synth.resume();
        isPaused = false;
      } else {
        synth.pause();
        isPaused = true;
      }
      updateUI();
    }

    function beforePlay(sec) {
      if (sec.open) sec.open();
      if (sec.el && sec.el.scrollIntoView) {
        sec.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function playSection(sec, onDone) {
      currentSec = sec;
      beforePlay(sec);
      updateUI();
      speakText(sectionText(sec), function () {
        if (!playAllActive) {
          currentSec = null;
          updateUI();
        }
        if (onDone) onDone();
      });
    }

    function playNext() {
      if (!playAllActive || playAllIndex >= sections.length) {
        stopAll();
        return;
      }
      var sec = sections[playAllIndex++];
      playSection(sec, function () {
        if (playAllActive && !isPaused) setTimeout(playNext, 700);
      });
    }

    sections.forEach(function (sec) {
      if (!sec.playBtn) return;
      bindInteractive(sec.playBtn, function () {
        if (currentSec === sec) {
          pauseResume();
          return;
        }
        stopAll();
        setTimeout(function () {
          playAllActive = false;
          playSection(sec, function () {
            currentSec = null;
            updateUI();
          });
        }, 60);
      });
    });

    if (mainBtn) {
      mainBtn.addEventListener('click', function () {
        if (playAllActive && !isPaused) {
          pauseResume();
        } else if (playAllActive && isPaused) {
          pauseResume();
          setTimeout(function () {
            if (playAllActive && !isPaused && !synth.speaking) playNext();
          }, 200);
        } else {
          stopAll();
          setTimeout(function () {
            playAllActive = true;
            playAllIndex = 0;
            playNext();
          }, 60);
        }
      });
    }

    if (stopBtn) stopBtn.addEventListener('click', stopAll);

    initSpeedButtons(function (rate) {
      currentRate = rate;
    });

    if (!synth) {
      var inner = $('.bpm-audio-inner');
      if (inner) {
        var note = document.createElement('p');
        note.style.cssText = 'font-size:12px;color:#8b0000;margin:0 0 0 auto;';
        note.textContent = 'Audio not supported in this browser. Try Chrome or Edge.';
        inner.appendChild(note);
      }
      return { stopAll: stopAll };
    }

    updateUI();
    return { stopAll: stopAll };
  }

  function openCollapsible(toggle, body) {
    if (!toggle || !body) return;
    body.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeCollapsible(toggle, body) {
    if (!toggle || !body) return;
    body.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function addMinimiseButton(body, onMinimise) {
    if (!body || body.querySelector('.bpm-minimise-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bpm-minimise-btn';
    btn.setAttribute('aria-label', 'Minimise this section');
    btn.innerHTML = '&#9650; Minimise';
    btn.addEventListener('click', onMinimise);
    body.appendChild(btn);
  }

  function initLessonNav() {
    var collapsible = [];
    $$('section[id]').forEach(function (section) {
      var toggle = $('.section-toggle', section);
      var body = $('.section-body', section);
      var h2 = $('h2', section);

      if (toggle && body) {
        collapsible.push({ toggle: toggle, body: body, section: section });

        if (!section.querySelector('.bpm-collapse-head')) {
          var head = document.createElement('div');
          head.className = 'bpm-collapse-head';
          section.insertBefore(head, toggle);

          var playBtn = document.createElement('button');
          playBtn.type = 'button';
          playBtn.className = 'bpm-play-section-btn bpm-on-light';
          playBtn.innerHTML = I_PLAY + ' Play Section';

          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'bpm-section-close-btn bpm-on-light';
          closeBtn.setAttribute('aria-label', 'Close section');
          closeBtn.innerHTML = '&#10005;';

          head.appendChild(toggle);
          head.appendChild(playBtn);
          head.appendChild(closeBtn);

          closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeCollapsible(toggle, body);
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });

          addMinimiseButton(body, function () {
            closeCollapsible(toggle, body);
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });

          section._bpmPlayBtn = playBtn;
        }
      } else if (h2 && !section.querySelector('.bpm-static-head')) {
        var staticHead = document.createElement('div');
        staticHead.className = 'bpm-static-head';
        var playStatic = document.createElement('button');
        playStatic.type = 'button';
        playStatic.className = 'bpm-play-section-btn bpm-on-light';
        playStatic.innerHTML = I_PLAY + ' Play Section';
        h2.parentNode.insertBefore(staticHead, h2);
        staticHead.appendChild(h2);
        staticHead.appendChild(playStatic);
        section._bpmPlayBtn = playStatic;
      }
    });

    var expandAll = $('#bpm-expand-all');
    var minimiseAll = $('#bpm-minimise-all');

    if (expandAll) {
      expandAll.addEventListener('click', function () {
        collapsible.forEach(function (item) {
          openCollapsible(item.toggle, item.body);
        });
      });
    }

    if (minimiseAll) {
      minimiseAll.addEventListener('click', function () {
        collapsible.forEach(function (item) {
          closeCollapsible(item.toggle, item.body);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    return collapsible;
  }

  function initLessonPage() {
    initLessonNav();

    var sections = $$('section[id]').map(function (section) {
      var titleEl = $('h2', section) || $('.section-toggle', section);
      var title = titleEl ? cleanText(titleEl.textContent.replace(/\u25BC|\u25B2|▼|▲/g, '')) : section.id;
      var toggle = $('.section-toggle', section);
      var body = $('.section-body', section);
      return {
        el: section,
        title: title,
        playBtn: section._bpmPlayBtn || null,
        open: function () {
          if (toggle && body) openCollapsible(toggle, body);
        },
        getText: function () {
          return extractSectionText(body || section);
        }
      };
    });

    sections.forEach(function (sec) {
      if (sec.playBtn) {
        sec.playBtn.setAttribute('aria-label', 'Play ' + sec.title + ' section');
      }
    });

    createAudioEngine({ sections: sections, mainLabel: 'Play Lesson' });
  }

  function initIndexPage() {
    var howToBtn = $('#how-to-btn');
    var howToBody = $('#how-to-body');
    var howToUse = $('#how-to-use');
    var howToWrap = howToUse || (howToBtn ? howToBtn.parentElement : null);

    if (howToBtn && howToBody && howToWrap && !howToBody.querySelector('.bpm-minimise-btn')) {
      if (!howToWrap.querySelector('.bpm-index-head')) {
        var head = document.createElement('div');
        head.className = 'bpm-index-head';
        howToWrap.insertBefore(head, howToBtn);
        head.appendChild(howToBtn);

        var playHowTo = document.createElement('button');
        playHowTo.type = 'button';
        playHowTo.className = 'bpm-play-section-btn';
        playHowTo.innerHTML = I_PLAY + ' Play Section';
        playHowTo.setAttribute('aria-label', 'Play How to use this guide section');
        head.appendChild(playHowTo);

        var closeHowTo = document.createElement('button');
        closeHowTo.type = 'button';
        closeHowTo.className = 'bpm-section-close-btn';
        closeHowTo.setAttribute('aria-label', 'Close section');
        closeHowTo.innerHTML = '&#10005;';
        head.appendChild(closeHowTo);

        closeHowTo.addEventListener('click', function (e) {
          e.stopPropagation();
          howToBody.classList.remove('open');
          howToBtn.setAttribute('aria-expanded', 'false');
          howToWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        howToWrap._bpmPlayBtn = playHowTo;
      }

      addMinimiseButton(howToBody, function () {
        howToBody.classList.remove('open');
        howToBtn.setAttribute('aria-expanded', 'false');
        howToWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    $$('.part-section').forEach(function (part, i) {
      if (part.querySelector('.bpm-part-head')) return;
      var header = $('.part-header', part);
      if (!header) return;
      var headWrap = document.createElement('div');
      headWrap.className = 'bpm-part-head';
      part.insertBefore(headWrap, header);
      headWrap.appendChild(header);

      var playPart = document.createElement('button');
      playPart.type = 'button';
      playPart.className = 'bpm-play-section-btn';
      playPart.innerHTML = I_PLAY + ' Play Section';
      var partTitle = cleanText($('h3', header) ? $('h3', header).textContent : 'Part ' + (i + 1));
      playPart.setAttribute('aria-label', 'Play ' + partTitle + ' section');
      headWrap.appendChild(playPart);
      part._bpmPlayBtn = playPart;
    });

    var expandAll = $('#bpm-expand-all');
    var minimiseAll = $('#bpm-minimise-all');
    if (expandAll && howToBtn && howToBody) {
      expandAll.addEventListener('click', function () {
        howToBody.classList.add('open');
        howToBtn.setAttribute('aria-expanded', 'true');
      });
    }
    if (minimiseAll && howToBtn && howToBody) {
      minimiseAll.addEventListener('click', function () {
        howToBody.classList.remove('open');
        howToBtn.setAttribute('aria-expanded', 'false');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var sections = [];

    var intro = $('.intro-note');
    if (intro) {
      var introPlay = document.createElement('button');
      introPlay.type = 'button';
      introPlay.className = 'bpm-play-section-btn bpm-on-light';
      introPlay.style.cssText = 'margin-top:8px;';
      introPlay.innerHTML = I_PLAY + ' Play Section';
      introPlay.setAttribute('aria-label', 'Play Welcome section');
      intro.appendChild(introPlay);
      sections.push({
        el: intro,
        title: 'Welcome',
        playBtn: introPlay,
        open: function () {
          intro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
        getText: function () { return extractSectionText(intro); }
      });
    }

    if (howToWrap && howToBody) {
      sections.push({
        el: howToWrap,
        title: 'How to use this guide',
        playBtn: howToWrap._bpmPlayBtn || null,
        open: function () {
          howToBody.classList.add('open');
          howToBtn.setAttribute('aria-expanded', 'true');
        },
        getText: function () { return extractSectionText(howToBody); }
      });
    }
    $$('.part-section').forEach(function (part) {
      var title = cleanText($('.part-header h3', part) ? $('.part-header h3', part).textContent : 'Part');
      sections.push({
        el: part,
        title: title,
        playBtn: part._bpmPlayBtn || null,
        open: function () {
          part.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
        getText: function () { return extractSectionText(part); }
      });
    });

    createAudioEngine({ sections: sections, mainLabel: 'Play Overview' });
  }

  function initToc() {
    var tocBtn = $('#toc-btn');
    var tocMenu = $('#toc-menu');
    if (!tocBtn || !tocMenu) return;

    tocBtn.addEventListener('click', function () {
      var open = tocMenu.classList.toggle('open');
      tocBtn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', function (e) {
      var container = $('.toc-container');
      if (container && !container.contains(e.target)) {
        tocMenu.classList.remove('open');
        tocBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && tocMenu.classList.contains('open')) {
        tocMenu.classList.remove('open');
        tocBtn.setAttribute('aria-expanded', 'false');
        tocBtn.focus();
      }
    });

    tocMenu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function () {
        tocMenu.classList.remove('open');
        tocBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-bpm-page');
    if (page === 'lesson') initLessonPage();
    else if (page === 'index') initIndexPage();
    initToc();
  });
})();
