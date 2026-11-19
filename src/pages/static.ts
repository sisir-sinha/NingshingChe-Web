import { currentUser, prefillFromAccount } from '../auth';
import { getAuthors, submitArticle } from '../api';
import { textToHtml } from '../sanitize';
import { authorCard } from '../components/cards';
import { SITE, T } from '../strings';
import type { View } from '../types';
import { B, esc, toast } from '../utils';
import { pageHead } from './listing';

export function notFoundPage(): View {
  return {
    title: `${T.notFound} | ${SITE.name}`,
    html: `<section class="container state">
      <p class="state__code" aria-hidden="true">৪০৪</p>
      <h1>${T.notFound}</h1>
      <p>${T.notFoundText}</p>
      <div class="pill-row pill-row--center">
        <a class="btn btn--primary" href="${B}/"><i class="fa-solid fa-house" aria-hidden="true"></i> ${T.backHome}</a>
        <a class="btn btn--ghost" href="${B}/recent">${T.recent}</a>
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

export function contactPage(): View {
  return {
    title: 'Contact Us | Ningshing Che',
    description: 'Contact Ningshing Che with questions, feedback, technical support, contributions, or privacy and account requests.',
    html: `<div lang="en">
      ${pageHead('Contact Us', 'fa-solid fa-envelope', 'Contact Us', 'Welcome to Ningshing Che!')}
      <article class="container container--narrow section prose">
        <p>Thank you for your interest in Ningshing Che. We value our readers, contributors, and community members. If you have questions, feedback, suggestions, or concerns about our website, digital publications, or mobile application, please feel free to contact us.</p>
        <h2>About Ningshing Che</h2>
        <p>Ningshing Che is a digital information platform and online magazine dedicated to the Bishnupriya Manipuri community. We aim to provide informative content and resources related to Bishnupriya Manipuri language, literature, history, culture, traditions, society, and community heritage.</p>
        <p>We welcome communication from readers, researchers, writers, contributors, and members of the community.</p>
        <h2>Publisher and Responsible Entity</h2>
        <p><strong>Publication Name:</strong> Ningshing Che<br>
        <strong>Responsible Legal Entity / Developer Account Holder:</strong> Surajit Singha Sisir<br>
        <strong>Website:</strong> <a href="${B}/">https://ningshingche.com/</a></p>
        <h2>Contact Information</h2>
        <p>For general inquiries, feedback, technical support, content-related questions, or other concerns, please contact us using the information below.</p>
        <p><strong>Email:</strong> <a href="mailto:${SITE.email}" data-external>${SITE.email}</a><br>
        <strong>Website:</strong> <a href="${B}/">https://ningshingche.com/</a></p>
        <h2>What Can You Contact Us About?</h2>
        <p>You can contact us regarding:</p>
        <ul>
          <li>General questions about Ningshing Che.</li>
          <li>Website and mobile application support.</li>
          <li>Content corrections or factual concerns.</li>
          <li>Bishnupriya Manipuri language, literature, and cultural contributions.</li>
          <li>Suggestions, feedback, and reader inquiries.</li>
          <li>Privacy-related questions and account-related requests.</li>
        </ul>
        <h2>Privacy and Account-Related Requests</h2>
        <p>If you have questions about how your personal information is handled or wish to request deletion of your account, please visit our Privacy Policy and Account Deletion pages.</p>
        <p><strong>Privacy Policy:</strong> <a href="${B}/privacy-policy/">https://ningshingche.com/privacy-policy/</a><br>
        <strong>Account Deletion:</strong> <a href="${B}/delete-account/">https://ningshingche.com/delete-account/</a></p>
        <h2>Our Commitment</h2>
        <p>We value transparency, responsible publishing, and communication with our readers. We aim to review inquiries and respond as soon as reasonably possible.</p>
        <p>Thank you for being part of the Ningshing Che community.</p>
        <p><strong>Ningshing Che</strong><br>Website: <a href="${B}/">https://ningshingche.com/</a></p>
      </article>
    </div>`,
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
        <a class="btn btn--ghost" href="${B}/">${T.backHome}</a>
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
          <label class="field"><span>লেখক পরিচিতি <b>*</b></span><textarea name="writer_info" rows="5" required placeholder="লেখক পরিচিতি লেখিক ..."></textarea></label>
        </fieldset>
        <fieldset>
          <legend><span>২</span> আর্টিকল</legend>
          <label class="field"><span>আর্টিকলর টাইটেল <b>*</b></span><input name="content_title" type="text" required placeholder="আর্টিকলর টাইটেল লিখিক"></label>
          <label class="field"><span>আর্টিকল <b>*</b></span><textarea name="content" rows="14" required placeholder="নিজর আর্টিকলহান লেখিক ..."></textarea></label>
        </fieldset>
        <p class="form__note" data-form-note hidden></p>
        <button class="btn btn--primary btn--lg" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> আর্টিকল পাঠুইক</button>
      </form>
    </section>`,
    mount(root) {
      prefillFromAccount(root);
      const form = root.querySelector<HTMLFormElement>('[data-article-form]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        note.hidden = true;
        const data = new FormData(form);
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        submit.disabled = true;
        note.hidden = false;
        note.classList.remove('form__note--error');
        try {
          await submitArticle(data, textToHtml(String(data.get('content') ?? '')), currentUser()?.id ?? null);
          form.reset();
          form.classList.remove('was-validated');
          prefillFromAccount(root);
          note.textContent = T.articleSent;
          toast(T.articleSent);
        } catch (err) {
          console.error(err);
          note.classList.add('form__note--error');
          note.textContent = T.articleFailed;
        }
        submit.disabled = false;
      });
    },
  };
}
