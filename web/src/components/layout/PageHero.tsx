import type { ReactNode } from 'react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: 'default' | 'gradient';
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  variant = 'default',
}: PageHeroProps) {
  return (
    <header className={`page-hero${variant === 'gradient' ? ' page-hero-gradient' : ''}`}>
      <div className="page-hero-body">
        {eyebrow ? <div className="page-hero-eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-hero-actions">{actions}</div> : null}
    </header>
  );
}
