import { AuthError, currentUser, login, loginWithGoogle, logout, pictureFromFile, register, updateProfile } from '../auth';
import type { User } from '../auth';
import { navigate } from '../router';
import { SITE, T } from '../strings';
import type { RouteContext, View } from '../types';
import { B, esc, toast } from '../utils';

const EMPTY: View = { title: SITE.name, html: '' };

/** Avatar markup: the picture, or the first letter of the name on a coloured disc. */
export function avatar(user: Pick<User, 'name' | 'picture'>, cls = ''): string {
  const initial = esc([...user.name.trim()][0] ?? '?');
  return user.picture
    ? `<span class="avatar ${cls}"><img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer"></span>`
    : `<span class="avatar avatar--initial ${cls}" aria-hidden="true">${initial}</span>`;
}

function errorText(err: unknown): string {
  if (err instanceof AuthError) {
    return {
      'email-taken': T.errTaken,
      'bad-credentials': T.errCredentials,
      unconfirmed: T.errUnconfirmed,
      weak: T.errShort,
      rate: T.errRate,
      google: T.errGoogle,
      image: T.errImage,
      network: T.errGeneric,
    }[err.code];
  }
  console.error(err);
  return T.errGeneric;
}

/** Where to go after signing in: ?next=/some/path (same site only) or the home page. */
function nextUrl(query: URLSearchParams): string {
  const next = query.get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? `${B}${next}` : `${B}/`;
}

const GOOGLE_ICON = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;

function googleBlock(): string {
  return `<div class="auth__google" data-google>
      <button type="button" class="btn btn--google" data-google-fallback>${GOOGLE_ICON}<span>${T.google}</span></button>
    </div>
    <div class="form__or"><span>${T.or}</span></div>`;
}

function passwordField(name: string, label: string, autocomplete: string, hint = ''): string {
  return `<label class="field"><span>${label} <b>*</b>${hint ? ` <small>(${hint})</small>` : ''}</span>
      <span class="field__pw">
        <input name="${name}" type="password" required minlength="8" autocomplete="${autocomplete}">
        <button type="button" class="field__eye" data-eye aria-label="${T.showPassword}" aria-pressed="false"><i class="fa-regular fa-eye" aria-hidden="true"></i></button>
      </span>
    </label>`;
}

function pictureField(current = ''): string {
  return `<div class="field picker" data-picker>
      <span>${T.picture}</span>
      <div class="picker__row">
        <span class="avatar avatar--xl picker__preview" data-preview>${current ? `<img src="${esc(current)}" alt="" referrerpolicy="no-referrer">` : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}</span>
        <div class="picker__actions">
          <label class="btn btn--ghost btn--sm picker__choose"><i class="fa-solid fa-camera" aria-hidden="true"></i> ${T.choosePicture}
            <input class="sr-only" name="picture" type="file" accept="image/png,image/jpeg,image/webp" aria-label="${T.picture}">
          </label>
          <button type="button" class="btn btn--ghost btn--sm" data-picture-clear ${current ? '' : 'hidden'}><i class="fa-solid fa-trash" aria-hidden="true"></i> ${T.removePicture}</button>
          <small>${T.pictureHint}</small>
        </div>
      </div>
    </div>`;
}

function shell(title: string, body: string): string {
  return `<section class="container auth">
    <div class="auth__card">
      <aside class="auth__aside">
        <img src="${SITE.logo}" alt="" width="72" height="72">
        <p class="auth__brand">${SITE.name}</p>
        <p>${T.authAside}</p>
      </aside>
      <div class="auth__body">
        <h1 class="auth__title">${title}</h1>
        ${body}
      </div>
    </div>
  </section>`;
}

/* ---------- behaviour shared by the forms ---------- */

function wireEyes(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('[data-eye]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement!.querySelector('input')!;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
    });
  });
}

/** Returns a getter for the chosen picture (data URL, '' if removed, undefined if untouched). */
function wirePicture(root: HTMLElement, showError: (msg: string) => void): () => string | undefined {
  const box = root.querySelector<HTMLElement>('[data-picker]')!;
  const input = box.querySelector<HTMLInputElement>('input[type="file"]')!;
  const preview = box.querySelector<HTMLElement>('[data-preview]')!;
  const clear = box.querySelector<HTMLButtonElement>('[data-picture-clear]')!;
  let value: string | undefined;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      value = await pictureFromFile(file);
      preview.innerHTML = `<img src="${value}" alt="">`;
      clear.hidden = false;
    } catch (err) {
      showError(errorText(err));
    }
    input.value = '';
  });
  clear.addEventListener('click', () => {
    value = '';
    preview.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    clear.hidden = true;
  });
  return () => value;
}

/** The Google button sends the browser to Google; it comes back signed in and opens `next`. */
function wireGoogle(root: HTMLElement, showError: (msg: string) => void, next: string): void {
  const button = root.querySelector<HTMLButtonElement>('[data-google-fallback]')!;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await loginWithGoogle(next);
    } catch (err) {
      button.disabled = false;
      showError(errorText(err));
    }
  });
}

function busy(form: HTMLFormElement, on: boolean): void {
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  btn.disabled = on;
  btn.classList.toggle('is-busy', on);
}

function signedIn(user: User, to: string): void {
  toast(`${T.welcome}, ${user.name}`);
  navigate(to, { replace: true });
}

/* ---------- /login ---------- */

export function loginPage({ query }: RouteContext): View {
  const to = nextUrl(query);
  if (currentUser()) {
    navigate(`${B}/profile`, { replace: true });
    return EMPTY;
  }
  const keep = query.get('next') ? `?next=${encodeURIComponent(query.get('next')!)}` : '';
  return {
    title: `${T.login} | ${SITE.name}`,
    html: shell(
      T.loginTitle,
      `${googleBlock()}
      <form class="form" data-login novalidate>
        <label class="field"><span>${T.email} <b>*</b></span><input name="email" type="email" required autocomplete="email" inputmode="email" placeholder="name@example.com"></label>
        ${passwordField('password', T.password, 'current-password')}
        <p class="form__note form__note--error" data-form-note role="alert" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> ${T.login}</button>
      </form>
      <p class="auth__switch">${T.noAccount} <a href="${B}/register${keep}">${T.createAccount}</a></p>`,
    ),
    mount(root) {
      const form = root.querySelector<HTMLFormElement>('[data-login]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      const showError = (msg: string) => {
        note.textContent = msg;
        note.hidden = false;
      };
      wireEyes(root);
      wireGoogle(root, showError, to);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        note.hidden = true;
        const data = new FormData(form);
        const email = String(data.get('email') ?? '');
        const password = String(data.get('password') ?? '');
        if (!email.trim() || !password || !form.querySelector<HTMLInputElement>('[name="email"]')!.validity.valid) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        busy(form, true);
        try {
          signedIn(await login(email, password), to);
        } catch (err) {
          showError(errorText(err));
          busy(form, false);
        }
      });
    },
  };
}

/* ---------- /register ---------- */

export function registerPage({ query }: RouteContext): View {
  const to = nextUrl(query);
  if (currentUser()) {
    navigate(`${B}/profile`, { replace: true });
    return EMPTY;
  }
  const keep = query.get('next') ? `?next=${encodeURIComponent(query.get('next')!)}` : '';
  return {
    title: `${T.register} | ${SITE.name}`,
    html: shell(
      T.registerTitle,
      `${googleBlock()}
      <form class="form" data-register novalidate>
        <label class="field"><span>${T.name} <b>*</b></span><input name="name" type="text" required autocomplete="name" maxlength="80" placeholder="নিজর নাঙহান লিখিক"></label>
        <label class="field"><span>${T.email} <b>*</b></span><input name="email" type="email" required autocomplete="email" inputmode="email" placeholder="name@example.com"></label>
        <div class="form__row">
          ${passwordField('password', T.password, 'new-password', T.passwordHint)}
          ${passwordField('confirm', T.confirmPassword, 'new-password')}
        </div>
        ${pictureField()}
        <p class="form__note form__note--error" data-form-note role="alert" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> ${T.createAccount}</button>
        <p class="form__hint auth__demo">${T.agreePrivacy} <a class="auth__link" href="${B}/privacy-policy">${T.privacy}</a></p>
      </form>
      <p class="auth__switch">${T.haveAccount} <a href="${B}/login${keep}">${T.login}</a></p>`,
    ),
    mount(root) {
      const form = root.querySelector<HTMLFormElement>('[data-register]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      const pw = form.querySelector<HTMLInputElement>('[name="password"]')!;
      const confirm = form.querySelector<HTMLInputElement>('[name="confirm"]')!;
      const showError = (msg: string) => {
        note.textContent = msg;
        note.hidden = false;
      };
      wireEyes(root);
      wireGoogle(root, showError, to);
      const picture = wirePicture(root, showError);

      const checkMatch = () => confirm.setCustomValidity(confirm.value && confirm.value !== pw.value ? T.errMismatch : '');
      pw.addEventListener('input', checkMatch);
      confirm.addEventListener('input', checkMatch);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        note.hidden = true;
        checkMatch();
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          if (pw.validity.tooShort) showError(T.errShort);
          else if (confirm.validity.customError) showError(T.errMismatch);
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        const data = new FormData(form);
        busy(form, true);
        try {
          const user = await register({
            name: String(data.get('name')),
            email: String(data.get('email')),
            password: pw.value,
            picture: picture() ?? '',
          });
          if (user === 'confirm') {
            // Supabase has sent a confirmation mail; the account works once it is opened.
            form.innerHTML = `<div class="auth__sent" role="status">
              <i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i>
              <h2>${T.confirmTitle}</h2>
              <p>${T.confirmText}</p>
              <p><strong>${esc(String(data.get('email')))}</strong></p>
              <a class="btn btn--primary" href="${B}/login">${T.login}</a>
            </div>`;
            return;
          }
          signedIn(user, to);
        } catch (err) {
          showError(errorText(err));
          busy(form, false);
        }
      });
    },
  };
}

/* ---------- /profile ---------- */

export function profilePage(): View {
  const user = currentUser();
  if (!user) {
    navigate(`${B}/login?next=${encodeURIComponent('/profile')}`, { replace: true });
    return EMPTY;
  }
  return {
    title: `${T.profile} | ${SITE.name}`,
    html: `<section class="container container--narrow profile">
      <header class="profile__head">
        ${avatar(user, 'avatar--xl')}
        <div>
          <h1 class="profile__name">${esc(user.name)}</h1>
          <p class="profile__email">${esc(user.email)}</p>
          <span class="chip"><i class="${user.provider === 'google' ? 'fa-brands fa-google' : 'fa-solid fa-envelope'}" aria-hidden="true"></i> ${user.provider === 'google' ? T.viaGoogle : T.viaPassword}</span>
        </div>
        <button type="button" class="btn btn--ghost profile__logout" data-logout><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> ${T.logout}</button>
      </header>
      <form class="form form--card" data-profile novalidate>
        <h2 class="auth__title">${T.editProfile}</h2>
        <label class="field"><span>${T.name} <b>*</b></span><input name="name" type="text" required maxlength="80" autocomplete="name" value="${esc(user.name)}"></label>
        <label class="field"><span>${T.email}</span><input type="email" value="${esc(user.email)}" disabled></label>
        ${pictureField(user.picture)}
        <p class="form__note form__note--error" data-form-note role="alert" hidden></p>
        <button class="btn btn--primary" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> ${T.saveChanges}</button>
      </form>
      <div class="pill-row">
        <a class="btn btn--ghost" href="${B}/blog_submission"><i class="fa-solid fa-feather-pointed" aria-hidden="true"></i> ${T.submitArticle}</a>
      </div>
    </section>`,
    mount(root) {
      const form = root.querySelector<HTMLFormElement>('[data-profile]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      const showError = (msg: string) => {
        note.textContent = msg;
        note.hidden = false;
      };
      const picture = wirePicture(root, showError);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        note.hidden = true;
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }
        try {
          const updated = await updateProfile({ name: String(new FormData(form).get('name')), picture: picture() });
          root.querySelector('.profile__name')!.textContent = updated.name;
          const old = root.querySelector('.profile__head .avatar')!;
          old.outerHTML = avatar(updated, 'avatar--xl');
          toast(T.saved);
        } catch (err) {
          showError(errorText(err));
        }
      });
    },
  };
}

/** Sign-out buttons anywhere on the site carry [data-logout]. */
export function initLogoutButtons(): void {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('[data-logout]')) return;
    logout();
    toast(T.loggedOut);
    navigate(`${B}/`);
  });
}
