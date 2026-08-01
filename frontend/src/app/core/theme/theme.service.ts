import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'di_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(document.documentElement.classList.contains('dark-theme'));

  toggle(): void {
    this.set(!this.isDark());
  }

  set(dark: boolean): void {
    document.documentElement.classList.toggle('dark-theme', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    this.isDark.set(dark);
  }
}
