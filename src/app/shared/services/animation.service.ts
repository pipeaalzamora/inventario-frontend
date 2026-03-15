import { Injectable } from '@angular/core';

type AnimationKey = 'fadeIn' | 'fadeOut' | 'slideIn' | 'slideOut';

interface AnimationConfig {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

@Injectable({
  providedIn: 'root'
})
export class AnimationService {

  private activeAnimations = new WeakMap<HTMLElement, Animation>();

  private readonly animations: Record<AnimationKey, AnimationConfig> = {
    fadeIn: {
      keyframes: [
        { opacity: 0 },
        { opacity: 1 }
      ],
      options: { duration: 300, easing: 'ease-in', fill: 'forwards' }
    },
    fadeOut: {
      keyframes: [
        { opacity: 1 },
        { opacity: 0 }
      ],
      options: { duration: 300, easing: 'ease-out', fill: 'forwards' }  
    },
    slideIn: {
      keyframes: [
        { transform: 'translateY(-100%)' },
        { transform: 'translateY(0)' }
      ],
      options: { duration: 400, easing: 'ease-out', fill: 'forwards' }
    },
    slideOut: {
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-100%)' }
      ],
      options: { duration: 400, easing: 'ease-in', fill: 'forwards' }
    }
  };

  public playAnimation(
    el: HTMLElement, 
    animationKey: AnimationKey,
    aditionalOptions?: Partial<KeyframeAnimationOptions>
  ): Promise<Animation> {

    this.cancelAnimation(el);

    const animationConfig = this.animations[animationKey];

    let options: KeyframeAnimationOptions = {};

    if (aditionalOptions) options = { ...animationConfig.options, ...aditionalOptions };
    else options = animationConfig.options;

    const animation = el.animate(animationConfig.keyframes, options);

    this.activeAnimations.set(el, animation);

    return animation.finished.finally(() => this.activeAnimations.delete(el));
  }

  public cancelAnimation(el: HTMLElement): void {
    this.activeAnimations.get(el)?.cancel();
    this.activeAnimations.delete(el);
  }

  public pauseAnimation(el: HTMLElement): void {
    this.activeAnimations.get(el)?.pause();
  }

  public resumeAnimation(el: HTMLElement): void {
    this.activeAnimations.get(el)?.play();
  }
}
