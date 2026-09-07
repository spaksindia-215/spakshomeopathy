/**
 * Styled placeholder for a photo the redesign calls for but that does not
 * exist in the asset library yet (hero portrait, division photography,
 * Mother Tincture bottle, clinic interior, Dr. Meena headshot, etc).
 * Renders a labeled sage-toned block instead of a real or stock photo —
 * see the design's own "Image treatment" notes for what each slot needs.
 */
export function PlaceholderImage({
  label,
  tone = 'light',
}: {
  label: string;
  tone?: 'light' | 'dark';
}) {
  const isDark = tone === 'dark';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        background: isDark ? '#1B4332' : '#D8E3DA',
        color: isDark ? 'rgba(247,244,236,.55)' : '#5C6F65',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '.02em',
        lineHeight: 1.5,
      }}
    >
      {label}
    </div>
  );
}
