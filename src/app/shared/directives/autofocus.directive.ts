import { AfterViewInit, Directive, ElementRef, inject, input } from '@angular/core';

/** Donne le focus à l'élément à l'affichage (premier champ d'un formulaire ou d'une fenêtre). */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly appAutofocus = input<boolean | ''>(true);

  ngAfterViewInit(): void {
    if (this.appAutofocus() !== false) queueMicrotask(() => this.el.nativeElement.focus());
  }
}
