import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ClerkProvider } from '@clerk/nextjs';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      publishableKey="pk_test_123"
      afterSignInUrl="/chat"
      afterSignUpUrl="/chat"
    >
      {children}
    </ClerkProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

