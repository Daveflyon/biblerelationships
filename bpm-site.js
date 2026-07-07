/* BPM shared navigation + audio (matches biblefoundations audio engine) */
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
      'button, select, input, textarea, .answers-toolbar, .answers-note, .flashcard-hint, .flashcard-back, .bpm-minimise-btn, .bpm-play-bar, .bpm-play-section-btn, .toc-container, script, style'
    ).forEach(function (el) { el.remove(); });
    return cleanText(clone.textContent || '');
  }

  var SPEAK_SKIP_SEL = 'button, select, input, textarea, .answers-toolbar, .answers-note, .flashcard-hint, .flashcard-back, .bpm-minimise-btn, .bpm-play-bar, .bpm-play-section-btn, .toc-container, script, style';

  function isSpeakSkipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (el.nodeType === 1 && el.matches && el.matches(SPEAK_SKIP_SEL)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function splitSentences(text) {
    var sentences = [];
    if (!text) return sentences;
    var re = /[^.!?]+(?:[.!?]+|$)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      var start = m.index;
      var end = m.index + m[0].length;
      sentences.push({
        start: start,
        end: end,
        text: text.substring(start, end).replace(/\s+/g, ' ').trim()
      });
    }
    if (!sentences.length) {
      sentences.push({ start: 0, end: text.length, text: cleanText(text) });
    }
    return sentences;
  }

  function isInSectionHeading(node, root) {
    var el = node.parentElement;
    while (el && el !== root) {
      if (el.matches && (
        el.matches('h2') ||
        el.matches('.section-toggle') ||
        el.matches('.part-btn') ||
        el.matches('.how-to-btn')
      )) return true;
      el = el.parentElement;
    }
    return false;
  }

  function extractSectionBodyText(section) {
    var body = $('.section-body', section);
    if (body) return extractSectionText(body);
    var clone = section.cloneNode(true);
    var heading = $('h2', clone) || $('.section-toggle', clone);
    if (heading) heading.remove();
    return extractSectionText(clone);
  }

  function collectSpeakTextNodes(root, skipHeading) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (isSpeakSkipped(node)) return NodeFilter.FILTER_REJECT;
        if (skipHeading && isInSectionHeading(node, root)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function buildFlatSpeakText(root, skipHeading) {
    var textNodes = collectSpeakTextNodes(root, !!skipHeading);
    var raw = '';
    var nodeStarts = [];
    textNodes.forEach(function (n) {
      nodeStarts.push({ n: n, rawStart: raw.length });
      raw += n.textContent;
    });
    var text = cleanText(raw);

    var normToRaw = [];
    var ni = 0;
    var ri = 0;
    while (ni < text.length) {
      normToRaw[ni] = Math.min(ri, Math.max(0, raw.length - 1));
      if (ri >= raw.length) {
        ni++;
        continue;
      }
      var nc = text.charAt(ni);
      var rc = raw.charAt(ri);
      if (nc === rc) {
        ni++;
        ri++;
      } else if (/\s/.test(rc)) {
        ri++;
      } else {
        ni++;
        ri++;
      }
    }

    function indexToNode(normIdx) {
      if (normIdx < 0) return null;
      if (normIdx >= normToRaw.length) normIdx = normToRaw.length - 1;
      if (normIdx < 0) return null;
      var rawIdx = normToRaw[normIdx];
      for (var i = nodeStarts.length - 1; i >= 0; i--) {
        if (rawIdx >= nodeStarts[i].rawStart) {
          var node = nodeStarts[i].n;
          var offset = rawIdx - nodeStarts[i].rawStart;
          return { n: node, offset: Math.min(offset, node.textContent.length) };
        }
      }
      return null;
    }

    return { text: text, indexToNode: indexToNode };
  }

  function buildFlatSpeakTextForSection(section) {
    var body = $('.section-body', section);
    if (body) return { flat: buildFlatSpeakText(body, false), root: body };
    return { flat: buildFlatSpeakText(section, true), root: section };
  }

  function blocksForNormRange(flat, contentRoot, start, end) {
    var blocks = [];
    var points = [start];
    if (end > start + 1) {
      points.push(end - 1);
      points.push(Math.floor((start + end) / 2));
    }
    points.forEach(function (pos) {
      var b = blockAtNormIndex(flat, contentRoot, pos);
      if (b && blocks.indexOf(b) < 0) blocks.push(b);
    });
    return blocks;
  }

  function blockAtNormIndex(flat, contentRoot, normIdx) {
    var info = flat.indexToNode(normIdx);
    if (!info) return null;
    var el = info.n.parentElement;
    while (el && el !== contentRoot) {
      if (el.matches && el.matches(
        'h3, h4, p, li, .scripture-text, .scripture-ref, .core-truth-statement, .core-truth-label, .question-text, td, .callout, blockquote, th'
      )) return el;
      el = el.parentElement;
    }
    el = info.n.parentElement;
    while (el && el !== contentRoot) {
      if (el.matches && el.matches('.opening-box, .scripture-block, .core-truth-box')) return el;
      el = el.parentElement;
    }
    return info.n.parentElement;
  }

  function wrapNormSpan(flat, start, end) {
    if (start < 0 || end <= start || end > flat.text.length) return null;
    var startInfo = flat.indexToNode(start);
    var endInfo = flat.indexToNode(end - 1);
    if (!startInfo || !endInfo) return null;
    try {
      var range = document.createRange();
      range.setStart(startInfo.n, startInfo.offset);
      var endOffset = endInfo.offset + 1;
      if (endInfo.n.textContent && endOffset > endInfo.n.textContent.length) {
        endOffset = endInfo.n.textContent.length;
      }
      range.setEnd(endInfo.n, endOffset);
      var mark = document.createElement('mark');
      mark.className = 'bpm-read-sentence';
      range.surroundContents(mark);
      return mark;
    } catch (e) {
      return null;
    }
  }

  function snapToSentenceStart(text, charIndex) {
    if (!text || charIndex <= 0) return 0;
    var sentences = splitSentences(text);
    for (var i = sentences.length - 1; i >= 0; i--) {
      if (charIndex >= sentences[i].start) return sentences[i].start;
    }
    return 0;
  }

  function unwrapReadMark(mark) {
    if (!mark || !mark.parentNode) return;
    var parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }

  function clearSectionHighlights(sec) {
    if (!sec || !sec.el) return;
    if (sec._btfActiveMark) {
      unwrapReadMark(sec._btfActiveMark);
      sec._btfActiveMark = null;
    }
    sec.el.querySelectorAll('.bpm-read-sentence').forEach(function (mark) {
      unwrapReadMark(mark);
    });
    sec.el.querySelectorAll('.bpm-reading-active').forEach(function (el) {
      el.classList.remove('bpm-reading-active');
    });
    sec._btfLastHighlightEl = null;
    sec._btfActiveSentenceIdx = -1;
    sec._btfSentences = null;
    sec._btfHighlightTargets = null;
  }

  function deactivateReadHighlight(sec) {
    if (!sec) return;
    if (sec._btfActiveMark) {
      sec._btfActiveMark.classList.remove('bpm-read-active');
      sec._btfActiveMark = null;
    }
    if (sec._btfActiveBlocks) {
      sec._btfActiveBlocks.forEach(function (b) {
        b.classList.remove('bpm-reading-active');
      });
      sec._btfActiveBlocks = null;
    }
    if (sec._btfLastHighlightEl) {
      sec._btfLastHighlightEl.classList.remove('bpm-reading-active');
      sec._btfLastHighlightEl = null;
    }
    sec._btfActiveSentenceIdx = -1;
  }

  function prepareSectionHighlights(sec, fullText) {
    clearSectionHighlights(sec);
    if (!sec || !sec.el || !fullText) return;

    var sentences = splitSentences(fullText);
    sec._btfSentences = sentences;

    var headingEl = $('h2', sec.el) || $('.section-toggle', sec.el);
    var bodyWrap = buildFlatSpeakTextForSection(sec.el);
    var bodyFlat = bodyWrap.flat;
    var contentRoot = bodyWrap.root;
    var titleLen = sec.title ? cleanText(sec.title + '. ').length : 0;
    var targets = [];

    sentences.forEach(function (sent, i) {
      var target = { mark: null, block: null, blocks: [] };
      if (sent.start < titleLen && headingEl) {
        target.block = headingEl;
        target.blocks = [headingEl];
      } else {
        var bodyStart = sent.start - titleLen;
        var bodyEnd = sent.end - titleLen;
        if (bodyStart >= 0 && bodyEnd <= bodyFlat.text.length) {
          target.blocks = blocksForNormRange(bodyFlat, contentRoot, bodyStart, bodyEnd);
          target.block = target.blocks[0] || null;
        }
      }
      targets[i] = target;
    });

    for (var j = sentences.length - 1; j >= 0; j--) {
      var sentJ = sentences[j];
      if (sentJ.start < titleLen) continue;
      var bStart = sentJ.start - titleLen;
      var bEnd = sentJ.end - titleLen;
      if (bStart < 0 || bEnd > bodyFlat.text.length) continue;
      var mark = wrapNormSpan(bodyFlat, bStart, bEnd);
      if (mark) targets[j].mark = mark;
    }

    sec._btfHighlightTargets = targets;
  }

  function updateReadHighlight(sec, fullText, charIndex) {
    if (!sec || !sec.el) return;
    var sentences = sec._btfSentences;
    if (!sentences || !sec._btfHighlightTargets) return;

    var activeIdx = -1;
    for (var i = 0; i < sentences.length; i++) {
      if (charIndex >= sentences[i].start && charIndex < sentences[i].end) {
        activeIdx = i;
        break;
      }
    }
    if (activeIdx < 0) {
      if (charIndex >= fullText.length && sentences.length) activeIdx = sentences.length - 1;
      else return;
    }
    if (sec._btfActiveSentenceIdx === activeIdx) return;

    deactivateReadHighlight(sec);
    sec._btfActiveSentenceIdx = activeIdx;

    var target = sec._btfHighlightTargets[activeIdx];
    if (!target) return;

    var scrollEl = null;
    if (target.mark) {
      target.mark.classList.add('bpm-read-active');
      sec._btfActiveMark = target.mark;
      scrollEl = target.mark;
    } else if (target.blocks && target.blocks.length) {
      sec._btfActiveBlocks = [];
      target.blocks.forEach(function (b) {
        b.classList.add('bpm-reading-active');
        sec._btfActiveBlocks.push(b);
      });
      scrollEl = target.blocks[0];
    } else if (target.block) {
      target.block.classList.add('bpm-reading-active');
      sec._btfLastHighlightEl = target.block;
      scrollEl = target.block;
    } else {
      for (var k = activeIdx; k >= 0; k--) {
        var prev = sec._btfHighlightTargets[k];
        if (prev && prev.blocks && prev.blocks.length) {
          sec._btfActiveBlocks = [];
          prev.blocks.forEach(function (b) {
            b.classList.add('bpm-reading-active');
            sec._btfActiveBlocks.push(b);
          });
          scrollEl = prev.blocks[0];
          break;
        }
        if (prev && prev.block) {
          prev.block.classList.add('bpm-reading-active');
          sec._btfLastHighlightEl = prev.block;
          scrollEl = prev.block;
          break;
        }
      }
    }
    if (scrollEl) scrollToView(scrollEl);
  }

  function bindInteractive(btn, handler) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    });
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function scrollToView(el) {
    if (!el || !el.scrollIntoView) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }

  function formatSpeedLabel(rate) {
    if (rate === 1) return '1.0x';
    if (rate === 2) return '2.0x';
    return String(rate) + 'x';
  }

  function initSpeedDropdown(setRate) {
    var dropdown = $('.bpm-speed-dropdown');
    var toggle = $('#bpm-speed-toggle');
    var menu = $('#bpm-speed-menu');
    var valueEl = $('.bpm-speed-value');
    var options = $$('.bpm-speed-option');
    if (!dropdown || !toggle || !menu) return;

    var rate = getStoredRate();

    function applyRate(chosen) {
      setStoredRate(chosen);
      setRate(chosen);
      if (valueEl) valueEl.textContent = formatSpeedLabel(chosen);
      options.forEach(function (opt) {
        var selected = parseFloat(opt.dataset.rate) === chosen;
        opt.classList.toggle('active', selected);
        opt.setAttribute('aria-selected', String(selected));
      });
    }

    function closeMenu() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    applyRate(rate);

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else closeMenu();
    });

    options.forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        applyRate(parseFloat(opt.dataset.rate));
        closeMenu();
      });
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  function createPlayButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bpm-play-section-btn bpm-on-light';
    btn.innerHTML = I_PLAY + ' Play Section';
    return btn;
  }

  function addPlayBar(container, collapsible) {
    var playBtn = createPlayButton();
    var bar = document.createElement('div');
    bar.className = collapsible ? 'bpm-play-bar' : 'bpm-play-bar bpm-play-always';
    bar.appendChild(playBtn);
    container.insertBefore(bar, container.firstChild);
    return playBtn;
  }

  function removePlaySectionUI(root) {
    var scope = root || document;
    scope.querySelectorAll('.bpm-play-bar').forEach(function (el) { el.remove(); });
    scope.querySelectorAll('.bpm-play-section-btn').forEach(function (el) { el.remove(); });
  }

  function unwrapLegacyLayout(section) {
    var collapseHead = $('.bpm-collapse-head', section);
    if (collapseHead) {
      var toggle = $('.section-toggle', collapseHead);
      if (toggle) section.insertBefore(toggle, collapseHead);
      collapseHead.remove();
    }

    var staticHead = $('.bpm-static-head', section);
    if (staticHead) {
      var h2 = $('h2', staticHead);
      if (h2) section.insertBefore(h2, staticHead);
      staticHead.remove();
    }

    section.querySelectorAll('.bpm-section-close-btn').forEach(function (el) { el.remove(); });
  }

  function unwrapIndexLegacy() {
    var indexHead = $('.bpm-index-head');
    if (indexHead) {
      var howToBtn = $('#how-to-btn');
      if (howToBtn) indexHead.parentNode.insertBefore(howToBtn, indexHead);
      indexHead.remove();
    }

    $$('.part-section').forEach(function (part) {
      var partHead = $('.bpm-part-head', part);
      if (partHead) {
        var header = $('.part-header', partHead);
        if (header) part.insertBefore(header, partHead);
        partHead.remove();
      }
      part.querySelectorAll('.bpm-section-close-btn').forEach(function (el) { el.remove(); });
    });
  }

  function sectionScrollEl(sec) {
    return (sec && sec.scrollEl) ? sec.scrollEl : sec.el;
  }

  function createAudioEngine(opts) {
    var synth = window.speechSynthesis;
    var sections = opts.sections;
    var mainLabel = opts.mainLabel;
    var progressLabel = opts.progressLabel || (opts.wholeLesson ? 'Lesson' : null);
    var wholeLessonMode = !!opts.wholeLesson;
    var currentRate = 1;
    var currentSec = null;
    var playAllActive = false;
    var playAllIndex = 0;
    var isPaused = false;
    var gen = 0;
    var spotlightSaved = null;
    var spotlightCurrent = null;
    var wholeLessonCurrentSec = null;
    var wholeLessonFullText = '';
    var wholeLessonSpeakOffset = 0;
    var wholeLessonPauseChar = 0;
    var wholeLessonSentenceIdx = 0;
    var wholeLessonPrevSec = null;
    var activeSpeakSec = null;
    var sectionSpeakDone = null;

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
        } else if (wholeLessonMode && playAllActive) {
          progressEl.textContent = (isPaused ? 'Paused: ' : 'Playing: ') + (progressLabel || 'Lesson');
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
        if (wholeLessonMode && playAllActive) {
          sec.playBtn.innerHTML = I_PLAY + ' Play Section';
          sec.playBtn.classList.remove('bpm-btn-active');
          if (sec.el) sec.el.classList.remove('bpm-section-playing');
          return;
        }
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

    function saveSpotlightStates() {
      if (!wholeLessonMode) return;
      spotlightSaved = sections.map(function (sec) {
        return sec.isOpen ? sec.isOpen() : true;
      });
    }

    function restoreSpotlightStates() {
      if (!wholeLessonMode || !spotlightSaved) return;
      sections.forEach(function (sec, i) {
        if (spotlightSaved[i]) {
          if (sec.open) sec.open();
        } else if (sec.close) {
          sec.close();
        }
      });
      spotlightSaved = null;
      spotlightCurrent = null;
    }

    function spotlightSection(sec) {
      if (!wholeLessonMode || !playAllActive) return;
      if (spotlightCurrent && spotlightCurrent !== sec && spotlightCurrent.close) {
        spotlightCurrent.close();
      }
      if (sec.open) sec.open();
      scrollToView(sectionScrollEl(sec));
      spotlightCurrent = sec;
    }

    function finishSectionSpeech(sec) {
      deactivateReadHighlight(sec);
      clearSectionHighlights(sec);
      var done = sectionSpeakDone;
      sectionSpeakDone = null;
      activeSpeakSec = null;
      if (!playAllActive) {
        currentSec = null;
        updateUI();
      }
      if (done) done();
    }

    function startSectionSpeech(sec, fromChar, reuseMap) {
      if (!sec || isPaused) return false;
      activeSpeakSec = sec;
      wholeLessonCurrentSec = sec;
      wholeLessonFullText = sectionText(sec);
      if (!reuseMap || !sec._btfHighlightTargets) {
        prepareSectionHighlights(sec, wholeLessonFullText);
      }
      wholeLessonSpeakOffset = fromChar > 0 ? fromChar : 0;
      wholeLessonSentenceIdx = 0;
      if (wholeLessonSpeakOffset > 0) {
        var snap = snapToSentenceStart(wholeLessonFullText, wholeLessonSpeakOffset);
        var sents = sec._btfSentences || [];
        for (var i = 0; i < sents.length; i++) {
          if (snap >= sents[i].start) wholeLessonSentenceIdx = i;
        }
      }
      speakSentenceAtIndex(sec, wholeLessonSentenceIdx);
      return true;
    }

    function speakSentenceAtIndex(sec, sentenceIdx) {
      if (!sec || isPaused || !synth) return;
      var sentences = sec._btfSentences;
      if (!sentences) return;
      if (sentenceIdx >= sentences.length) {
        if (playAllActive && !isPaused) playNext();
        else finishSectionSpeech(sec);
        return;
      }

      wholeLessonSentenceIdx = sentenceIdx;
      var sent = sentences[sentenceIdx];
      wholeLessonPauseChar = sent.start;
      updateReadHighlight(sec, wholeLessonFullText, sent.start);

      gen++;
      var myGen = gen;
      isPaused = false;
      if (synth) {
        try {
          if (synth.paused) synth.resume();
        } catch (e) {}
        synth.cancel();
      }

      var u = new SpeechSynthesisUtterance(sent.text);
      u.lang = 'en-GB';
      u.rate = currentRate;
      u.onend = function () {
        if (myGen !== gen) return;
        deactivateReadHighlight(sec);
        if (!isPaused) speakSentenceAtIndex(sec, sentenceIdx + 1);
      };
      u.onerror = function (e) {
        if (myGen !== gen || e.error === 'interrupted') return;
        deactivateReadHighlight(sec);
        if (!isPaused) speakSentenceAtIndex(sec, sentenceIdx + 1);
      };
      synth.speak(u);
    }

    function speakWholeLessonSection(sec, fromChar, reuseMap) {
      if (!sec || !playAllActive || isPaused) return;
      startSectionSpeech(sec, fromChar, reuseMap);
    }

    function restartWholeLessonCurrentSection() {
      if (!wholeLessonCurrentSec || isPaused) return;
      if (playAllActive) {
        startSectionSpeech(wholeLessonCurrentSec, wholeLessonPauseChar, true);
      } else if (activeSpeakSec) {
        startSectionSpeech(activeSpeakSec, wholeLessonPauseChar, true);
      }
    }

    function pauseSpeaking() {
      if (isPaused || (!currentSec && !activeSpeakSec)) return;
      isPaused = true;
      gen++;
      if (synth) {
        try {
          if (synth.paused) synth.resume();
        } catch (e) {}
        synth.cancel();
      }
      updateUI();
    }

    function resumeSpeaking() {
      if (!isPaused || !activeSpeakSec) return;
      isPaused = false;
      updateUI();
      restartWholeLessonCurrentSection();
    }

    function pauseWholeLesson() {
      if (!playAllActive || isPaused) return;
      pauseSpeaking();
    }

    function resumeWholeLesson() {
      if (!playAllActive || !isPaused || !wholeLessonCurrentSec) return;
      resumeSpeaking();
    }

    function stopAll() {
      restoreSpotlightStates();
      if (wholeLessonPrevSec) clearSectionHighlights(wholeLessonPrevSec);
      if (wholeLessonCurrentSec && wholeLessonCurrentSec !== wholeLessonPrevSec) {
        clearSectionHighlights(wholeLessonCurrentSec);
      }
      if (activeSpeakSec) clearSectionHighlights(activeSpeakSec);
      wholeLessonCurrentSec = null;
      wholeLessonPrevSec = null;
      activeSpeakSec = null;
      sectionSpeakDone = null;
      wholeLessonFullText = '';
      wholeLessonSpeakOffset = 0;
      wholeLessonPauseChar = 0;
      wholeLessonSentenceIdx = 0;
      playAllActive = false;
      isPaused = false;
      currentSec = null;
      playAllIndex = 0;
      gen++;
      if (synth) {
        try {
          if (synth.paused) synth.resume();
        } catch (e) {}
        synth.cancel();
      }
      updateUI();
    }

    function pauseResume() {
      if (!currentSec) return;
      if (isPaused) resumeSpeaking();
      else pauseSpeaking();
    }

    function beforePlay(sec) {
      if (sec.open) sec.open();
      scrollToView(sectionScrollEl(sec));
    }

    function playSection(sec, onDone) {
      currentSec = sec;
      sectionSpeakDone = onDone;
      beforePlay(sec);
      updateUI();
      startSectionSpeech(sec, 0, false);
    }

    function playNext() {
      if (!playAllActive || playAllIndex >= sections.length) {
        stopAll();
        return;
      }
      var sec = sections[playAllIndex++];
      if (wholeLessonMode) {
        if (wholeLessonPrevSec && wholeLessonPrevSec !== sec) {
          clearSectionHighlights(wholeLessonPrevSec);
        }
        wholeLessonPrevSec = sec;
        wholeLessonCurrentSec = sec;
        wholeLessonPauseChar = 0;
        wholeLessonSpeakOffset = 0;
        currentSec = { title: 'Lesson', playBtn: null, el: null };
        spotlightSection(sec);
        updateUI();
        speakWholeLessonSection(sec, 0);
        return;
      }
      playSection(sec, function () {
        if (playAllActive && !isPaused) playNext();
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
            updateUI();
          });
        }, 60);
      });
    });

    if (mainBtn) {
      mainBtn.addEventListener('click', function () {
        if (playAllActive && !isPaused) {
          if (wholeLessonMode) pauseWholeLesson();
          else pauseResume();
        } else if (playAllActive && isPaused) {
          if (wholeLessonMode) resumeWholeLesson();
          else resumeSpeaking();
        } else {
          stopAll();
          setTimeout(function () {
            saveSpotlightStates();
            playAllActive = true;
            playAllIndex = 0;
            playNext();
          }, 60);
        }
      });
    }

    if (stopBtn) stopBtn.addEventListener('click', stopAll);

    initSpeedDropdown(function (rate) {
      var wasPlaying = activeSpeakSec && !isPaused && synth && synth.speaking;
      var sec = activeSpeakSec;
      var idx = wholeLessonSentenceIdx;
      currentRate = rate;
      if (wasPlaying && sec && synth) {
        gen++;
        synth.cancel();
        speakSentenceAtIndex(sec, idx);
      }
    });

    if (!synth) {
      disableAudioControls(mainBtn, stopBtn, sections);
      return { stopAll: function () {} };
    }

    updateUI();
    return { stopAll: stopAll };
  }

  function disableAudioControls(mainBtn, stopBtn, sections) {
    if (mainBtn) {
      mainBtn.disabled = true;
      mainBtn.setAttribute('aria-disabled', 'true');
    }
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.setAttribute('aria-disabled', 'true');
    }
    sections.forEach(function (sec) {
      if (sec.playBtn) {
        sec.playBtn.disabled = true;
        sec.playBtn.setAttribute('aria-disabled', 'true');
      }
    });
    var inner = $('.bpm-audio-inner');
    if (inner && !inner.querySelector('.bpm-audio-unsupported')) {
      var note = document.createElement('p');
      note.className = 'bpm-audio-unsupported';
      note.style.cssText = 'font-size:12px;color:#8b0000;margin:0 0 0 auto;';
      note.textContent = 'Audio not supported in this browser. Try Chrome or Edge.';
      inner.appendChild(note);
    }
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
      unwrapLegacyLayout(section);

      var toggle = $('.section-toggle', section);
      var body = $('.section-body', section);

      if (toggle && body) {
        collapsible.push({ toggle: toggle, body: body, section: section });

        toggle.addEventListener('click', function () {
          var open = body.classList.toggle('open');
          toggle.setAttribute('aria-expanded', String(open));
        });

        if (!body.querySelector('.bpm-play-bar')) {
          section._btfPlayBtn = addPlayBar(body, true);
          addMinimiseButton(body, function () {
            closeCollapsible(toggle, body);
            scrollToView(section);
          });
        }
      } else {
        removePlaySectionUI(section);
        section._btfPlayBtn = null;
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
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    }

    return collapsible;
  }

  function initLessonPage() {
    initLessonNav();

    var sections = $$('section[id]').map(function (section) {
      var titleEl = $('h2', section) || $('.section-toggle', section);
      var title = titleEl ? cleanText(titleEl.textContent.replace(/\u25BC|\u25B2|\u25BE|\u25B4|▼|▲|▼/g, '')) : section.id;
      var toggle = $('.section-toggle', section);
      var body = $('.section-body', section);
      var collapsible = !!(toggle && body);
      return {
        el: section,
        title: title,
        playBtn: collapsible ? (section._btfPlayBtn || null) : null,
        open: function () {
          if (toggle && body) openCollapsible(toggle, body);
        },
        close: function () {
          if (toggle && body) closeCollapsible(toggle, body);
        },
        isOpen: function () {
          return !!(body && body.classList.contains('open'));
        },
        getText: function () {
          return extractSectionBodyText(section);
        }
      };
    });

    sections.forEach(function (sec) {
      if (sec.playBtn) {
        sec.playBtn.setAttribute('aria-label', 'Play ' + sec.title + ' section');
      }
    });

    createAudioEngine({ sections: sections, mainLabel: 'Play Lesson', wholeLesson: true });
  }

  function initIndexPage() {
    unwrapIndexLegacy();
    removePlaySectionUI(document.body);

    var howToBtn = $('#how-to-btn');
    var howToBody = $('#how-to-body');
    var howToWrap = $('#how-to-use');

    function setIndexCollapsible(btn, body, open) {
      if (!btn || !body) return;
      body.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    }

    function getIndexCollapsibles() {
      var items = [];
      if (howToBtn && howToBody) items.push({ btn: howToBtn, body: howToBody });
      $$('.part-section').forEach(function (part) {
        var btn = $('.part-btn', part);
        var body = $('.part-body', part);
        if (btn && body) items.push({ btn: btn, body: body });
      });
      return items;
    }

    getIndexCollapsibles().forEach(function (item) {
      item.btn.addEventListener('click', function () {
        setIndexCollapsible(item.btn, item.body, !item.body.classList.contains('open'));
      });
    });

    if (howToBtn && howToBody && howToWrap && !howToBody.querySelector('.bpm-minimise-btn')) {
      addMinimiseButton(howToBody, function () {
        howToBody.classList.remove('open');
        howToBtn.setAttribute('aria-expanded', 'false');
        howToWrap.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      });
    }

    var expandAll = $('#bpm-expand-all');
    var minimiseAll = $('#bpm-minimise-all');
    if (expandAll) {
      expandAll.addEventListener('click', function () {
        getIndexCollapsibles().forEach(function (item) {
          setIndexCollapsible(item.btn, item.body, true);
        });
      });
    }
    if (minimiseAll) {
      minimiseAll.addEventListener('click', function () {
        getIndexCollapsibles().forEach(function (item) {
          setIndexCollapsible(item.btn, item.body, false);
        });
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    }

    var sections = [];

    var intro = $('.intro-note');
    if (intro) {
      sections.push({
        el: intro,
        scrollEl: intro,
        title: 'Welcome',
        playBtn: null,
        open: function () {
          scrollToView(intro);
        },
        close: function () {},
        isOpen: function () { return true; },
        getText: function () { return extractSectionText(intro); }
      });
    }

    if (howToWrap && howToBody) {
      sections.push({
        el: howToBody,
        scrollEl: howToWrap,
        title: 'How to use this guide',
        playBtn: null,
        open: function () {
          howToBody.classList.add('open');
          howToBtn.setAttribute('aria-expanded', 'true');
        },
        close: function () {
          howToBody.classList.remove('open');
          howToBtn.setAttribute('aria-expanded', 'false');
        },
        isOpen: function () {
          return howToBody.classList.contains('open');
        },
        getText: function () { return extractSectionText(howToBody); }
      });
    }

    $$('.part-section').forEach(function (part) {
      var titleEl = $('.part-btn-title', part);
      var title = cleanText(titleEl ? titleEl.textContent : 'Section');
      var partBtn = $('.part-btn', part);
      var partBody = $('.part-body', part);
      sections.push({
        el: partBody || part,
        scrollEl: part,
        title: title,
        playBtn: null,
        open: function () {
          if (partBtn && partBody) {
            partBody.classList.add('open');
            partBtn.setAttribute('aria-expanded', 'true');
          }
          scrollToView(part);
        },
        close: function () {
          if (partBtn && partBody) {
            partBody.classList.remove('open');
            partBtn.setAttribute('aria-expanded', 'false');
          }
        },
        isOpen: function () {
          return !!(partBody && partBody.classList.contains('open'));
        },
        getText: function () {
          return extractSectionText(partBody || part);
        }
      });
    });

    // F1 index compatibility: support non-collapsible section groups.
    if (!sections.length || !$$('.part-section').length) {
      $$('.section-group').forEach(function (group) {
        var titleEl = $('.section-header h3', group);
        var title = cleanText(titleEl ? titleEl.textContent : 'Section');
        sections.push({
          el: group,
          scrollEl: group,
          title: title,
          playBtn: null,
          open: function () { scrollToView(group); },
          close: function () {},
          isOpen: function () { return true; },
          getText: function () { return extractSectionText(group); }
        });
      });
    }

    createAudioEngine({
      sections: sections,
      mainLabel: 'Play Overview',
      wholeLesson: true,
      progressLabel: 'Overview'
    });
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
      link.addEventListener('click', function (e) {
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
        tocMenu.classList.remove('open');
        tocBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initResponsiveTables() {
    $$('.table-wrap table').forEach(function (table) {
      var headers = [];
      table.querySelectorAll('thead th').forEach(function (th) {
        headers.push(cleanText(th.textContent));
      });
      if (!headers.length) return;
      table.querySelectorAll('tbody tr').forEach(function (row) {
        row.querySelectorAll('td').forEach(function (td, i) {
          if (!td.getAttribute('data-label') && headers[i]) {
            td.setAttribute('data-label', headers[i]);
          }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-bpm-page');
    if (page === 'lesson') initLessonPage();
    else if (page === 'index') initIndexPage();
    initToc();
    initResponsiveTables();
  });
})();
