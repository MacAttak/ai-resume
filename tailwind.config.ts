import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssTypography from '@tailwindcss/typography';

const config: Config = {
  darkMode: ['class', '.dark'],
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    './node_modules/streamdown/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none', // Remove max-width for chat bubbles
            color: 'inherit', // Use theme colors
            p: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            'p:first-child': {
              marginTop: 0,
            },
            'p:last-child': {
              marginBottom: 0,
            },
            a: {
              color: 'hsl(var(--primary))',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            strong: {
              color: 'inherit',
              fontWeight: '600',
            },
            code: {
              color: 'inherit',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            h1: {
              color: 'inherit',
            },
            h2: {
              color: 'inherit',
            },
            h3: {
              color: 'inherit',
            },
            h4: {
              color: 'inherit',
            },
            blockquote: {
              color: 'inherit',
              borderLeftColor: 'hsl(var(--muted-foreground) / 0.3)',
            },
            hr: {
              borderColor: 'hsl(var(--border))',
            },
            ul: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            ol: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
          },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};
export default config;
