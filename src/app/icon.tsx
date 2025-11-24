/**
 * Dynamic favicon generation using Next.js App Router icon file convention
 *
 * Creates a circular masked icon from the macattak.png profile image
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://chatwithdan.chat/macattak.png"
          alt="Icon"
          width="512"
          height="512"
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
