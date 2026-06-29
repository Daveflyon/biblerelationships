/* Shared lesson-page interactions (flashcards, fillable answers) */
(function () {
  'use strict';

  function storageOK() {
    try {
      localStorage.setItem('_bpm_t', '1');
      localStorage.removeItem('_bpm_t');
      return true;
    } catch (e) {
      return false;
    }
  }

  function fillableText(cell) {
    if (!cell) return '';
    var el = cell.querySelector('.fillable');
    return el ? el.innerText.trim() : '';
  }

  function lessonSlug() {
    var path = window.location.pathname.split('/').pop() || '';
    var m = path.match(/^(bpm-l\d+)/i);
    return m ? m[1].toLowerCase() : 'bpm-lesson';
  }

  function lessonLabel() {
    var title = document.title || '';
    var parts = title.split(/\s*[–-]\s*/);
    return parts[0] ? parts[0].trim() : 'Bible Pointers on Marriage Lesson';
  }

  function scrollBehavior() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    } catch (e) {
      return 'smooth';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-bpm-page') !== 'lesson') return;

    document.querySelectorAll('.flashcard').forEach(function (card) {
      function setFlipState() {
        var flipped = card.classList.contains('flipped');
        card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      }
      function flip() {
        card.classList.toggle('flipped');
        setFlipState();
      }
      setFlipState();
      card.addEventListener('click', flip);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      });
    });

    var canStore = storageOK();
    var fillables = document.querySelectorAll('.fillable[data-key]');

    fillables.forEach(function (el) {
      var question = el.closest('tr');
      if (question) {
        var qCell = question.querySelector('td');
        var label = qCell ? qCell.innerText.trim() : '';
        if (label && !el.getAttribute('aria-label')) {
          el.setAttribute('aria-label', 'Answer for: ' + label);
        }
      }
      if (canStore) {
        var saved = localStorage.getItem(el.getAttribute('data-key'));
        if (saved) el.textContent = saved;
      }
    });

    fillables.forEach(function (el) {
      el.addEventListener('input', function () {
        if (!canStore) return;
        try {
          localStorage.setItem(el.getAttribute('data-key'), el.textContent);
        } catch (e) {}
      });
    });

    var downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        var questions = document.querySelectorAll('#discovery-questions tbody tr');
        var lines = [
          'Bible Pointers on Marriage',
          lessonLabel(),
          'Key Discovery Questions',
          ''
        ];
        questions.forEach(function (row, i) {
          var cells = row.querySelectorAll('td');
          var question = cells[0] ? cells[0].innerText.trim() : '';
          var answer = fillableText(cells[1]) || '(no answer entered)';
          var notes = fillableText(cells[2]) || '(no notes entered)';
          lines.push('Q' + (i + 1) + ': ' + question);
          lines.push('My Answer: ' + answer);
          lines.push('Group Notes: ' + notes);
          lines.push('');
        });
        try {
          var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = lessonSlug() + '-my-answers.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
    }

    var clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!confirm('Clear all your answers for this lesson? This cannot be undone.')) return;
        fillables.forEach(function (el) {
          el.textContent = '';
          if (canStore) {
            try {
              localStorage.removeItem(el.getAttribute('data-key'));
            } catch (e) {}
          }
        });
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        }
      });
    });
  });
})();
