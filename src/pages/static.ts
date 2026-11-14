import { BackendMissingError, getAuthors, submitArticle } from '../api';
import { authorCard } from '../components/cards';
import { SITE, T } from '../strings';
import type { View } from '../types';
import { esc, toast } from '../utils';
import { pageHead } from './listing';

export function notFoundPage(): View {
  return {
    title: `${T.notFound} | ${SITE.name}`,
    html: `<section class="container state">
      <p class="state__code" aria-hidden="true">৪০৪</p>
      <h1>${T.notFound}</h1>
      <p>${T.notFoundText}</p>
      <div class="pill-row pill-row--center">
        <a class="btn btn--primary" href="/"><i class="fa-solid fa-house" aria-hidden="true"></i> ${T.backHome}</a>
        <a class="btn btn--ghost" href="/recent">${T.recent}</a>
      </div>
    </section>`,
  };
}

export function errorPage(): View {
  return {
    title: SITE.name,
    html: `<section class="container state">
      <p class="state__code" aria-hidden="true"><i class="fa-solid fa-plug-circle-xmark"></i></p>
      <h1>${T.loadError}</h1>
      <div class="pill-row pill-row--center"><button type="button" class="btn btn--primary" data-retry><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> ${T.retry}</button></div>
    </section>`,
    mount(root) {
      root.querySelector('[data-retry]')?.addEventListener('click', () => location.reload());
    },
  };
}

export function loadingHtml(): string {
  const card = '<div class="skeleton skeleton--card"></div>';
  return `<div class="container section" aria-busy="true" aria-label="${T.loading}">
    <div class="skeleton skeleton--hero"></div>
    <div class="grid grid--3" style="margin-top:1.5rem">${card.repeat(3)}</div>
  </div>`;
}

export async function aboutPage(): Promise<View> {
  const authors = await getAuthors();
  const self = authors.find((a) => a.name === SITE.name);
  const team = authors.filter((a) => a.role.includes(SITE.name) && a.name !== SITE.name);
  return {
    title: `${T.about} | ${SITE.name}`,
    description: SITE.description,
    html: `
    ${pageHead(T.about, 'fa-solid fa-circle-info', T.about, SITE.tagline)}
    <section class="container container--narrow section about">
      <img class="about__logo" src="${SITE.logo}" alt="${SITE.name}" width="120" height="120">
      <p class="about__lead">${SITE.description}</p>
      ${self?.bio ? `<div class="prose">${self.bio.split('\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
      <ul class="contact-cards">
        <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><a href="${SITE.map}" target="_blank" rel="noopener">${SITE.address}</a></li>
        <li><i class="fa-solid fa-phone" aria-hidden="true"></i><a href="tel:${SITE.phone.replace(/[^+\d]/g, '')}" data-external>${SITE.phone}</a></li>
        <li><i class="fa-solid fa-envelope" aria-hidden="true"></i><a href="mailto:${SITE.email}" data-external>${SITE.email}</a></li>
      </ul>
    </section>
    ${
      team.length
        ? `<section class="band section"><div class="container">
            <div class="section-head"><h2 class="section-title">${SITE.name}</h2></div>
            <div class="grid grid--authors">${team.map(authorCard).join('')}</div>
          </div></section>`
        : ''
    }`,
  };
}

export function socialPage(): View {
  return {
    title: `${T.social} | ${SITE.name}`,
    html: `
    ${pageHead(T.social, 'fa-solid fa-people-group', T.social)}
    <section class="container state">
      <p class="state__code" aria-hidden="true"><i class="fa-solid fa-person-digging"></i></p>
      <h2>${T.comingSoon}</h2>
      <div class="pill-row pill-row--center">
        <a class="btn btn--primary" href="${SITE.facebook}" target="_blank" rel="noopener"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i> Facebook</a>
        <a class="btn btn--ghost" href="/">${T.backHome}</a>
      </div>
    </section>`,
  };
}

export function submitPage(): View {
  return {
    title: `${T.submitArticle} | ${SITE.name}`,
    description: `${T.submitArticle} — ${SITE.description}`,
    html: `
    ${pageHead(T.submitArticle, 'fa-solid fa-feather-pointed', 'নিংশিং আর্টিকল ফর্ম')}
    <section class="container container--narrow section">
      <form class="form form--card" data-article-form novalidate>
        <fieldset>
          <legend><span>১</span> লেখক</legend>
          <div class="form__row">
            <label class="field"><span>নাঙহান <b>*</b></span><input name="title" type="text" required autocomplete="name" placeholder="নিজর নাঙহান ইমার ঠারে লিখিক"></label>
            <label class="field"><span>ফেইসবুক প্রফাইল লিংক <b>*</b></span><input name="facebook" type="url" required placeholder="https://facebook.com/…"></label>
          </div>
          <label class="field"><span>ঠিকানাহান <b>*</b></span><input name="address" type="text" required autocomplete="street-address" placeholder="ঠিকানাহান লিখিক"></label>
          <div class="form__row">
            <label class="field"><span>ইমেইল <b>*</b></span><input name="email" type="email" required autocomplete="email" placeholder="নিজর ইমেইল বহিক"></label>
            <label class="field"><span>ফোন নম্বর <b>*</b></span><input name="phone" type="tel" required autocomplete="tel" placeholder="নিজর ফোন নম্বরগো বহিক"></label>
          </div>
          <label class="field"><span>লেখকর ছবি</span><input name="picture_file" type="file" accept=".jpg,.jpeg,.png"></label>
          <label class="field"><span>লেখক পরিচিতি <b>*</b></span><textarea name="writer_info" rows="5" required placeholder="লেখক পরিচিতি লেখিক ..."></textarea></label>
        </fieldset>
        <fieldset>
          <legend><span>২</span> আর্টিকল</legend>
          <label class="field"><span>আর্টিকলর টাইটেল <b>*</b></span><input name="content_title" type="text" required placeholder="আর্টিকলর টাইটেল লিখিক"></label>
          <p class="form__hint">লেখা হান অথবা ফাইলগ দে</p>
          <label class="field"><span>আর্টিকল</span><textarea name="content" rows="10" placeholder="নিজর আর্টিকলহান লেখিক ..."></textarea></label>
          <div class="form__or"><span>অথবা</span></div>
          <label class="field"><span>আর্টিকল ফাইল <small>(.doc, .pdf, .zip)</small></span><input name="file" type="file" accept=".doc,.docx,.pdf,.zip"></label>
        </fieldset>
        <p class="form__note" data-form-note hidden></p>
        <button class="btn btn--primary btn--lg" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> আর্টিকল পাঠুইক</button>
      </form>
    </section>`,
    mount(root) {
      const form = root.querySelector<HTMLFormElement>('[data-article-form]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        note.hidden = true;
        const data = new FormData(form);
        const hasText = String(data.get('content') ?? '').trim().length > 0;
        const file = data.get('file');
        const hasFile = file instanceof File && file.size > 0;
        if (!form.checkValidity() || (!hasText && !hasFile)) {
          form.classList.add('was-validated');
          if (form.checkValidity()) {
            note.hidden = false;
            note.textContent = 'আর্টিকল লেখিক, নাইলে ফাইল আগো দে।';
          }
          (form.querySelector<HTMLElement>(':invalid') ?? form.querySelector<HTMLElement>('[name="content"]'))?.focus();
          return;
        }
        try {
          await submitArticle(data);
          form.reset();
          form.classList.remove('was-validated');
          toast('আর্টিকল পাঠানো হয়েছে');
        } catch (err) {
          note.hidden = false;
          note.textContent =
            err instanceof BackendMissingError
              ? 'ডেমো সংস্করণ: লেখাটি সার্ভারে পাঠানো হয়নি। src/api.ts ফাইলে submitArticle() ফাংশনে API যুক্ত করুন।'
              : 'লেখা পাঠানো যায়নি। আবার চেষ্টা করুন।';
        }
      });
    },
  };
}
