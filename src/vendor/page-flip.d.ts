export class PageFlip {
  constructor(element: HTMLElement, options: Record<string, string | number | boolean>);
  loadFromHTML(pages: HTMLElement[]): void;
  on(event: string, callback: (event: { data: number | string }) => void): void;
  flipNext(): void;
  flipPrev(): void;
  turnToPage(page: number): void;
  getCurrentPageIndex(): number;
  getOrientation(): string;
  destroy(): void;
}
