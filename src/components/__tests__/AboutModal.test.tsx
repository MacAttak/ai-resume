import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutModal } from '../AboutModal';

describe('AboutModal', () => {
  it('renders modal trigger button', () => {
    render(<AboutModal />);
    const triggerButton = screen.getByRole('button', {
      name: /about agent mccarthy/i,
    });
    expect(triggerButton).toBeInTheDocument();
  });

  it('renders custom trigger when provided', () => {
    render(
      <AboutModal>
        <button>Custom Trigger</button>
      </AboutModal>
    );
    const customTrigger = screen.getByRole('button', {
      name: /custom trigger/i,
    });
    expect(customTrigger).toBeInTheDocument();
  });

  it('opens modal and displays title when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    const triggerButton = screen.getByRole('button', {
      name: /about agent mccarthy/i,
    });
    await user.click(triggerButton);

    const modalTitle = screen.getByRole('heading', {
      name: /about agent mccarthy/i,
    });
    expect(modalTitle).toBeInTheDocument();
  });

  it('displays AI development preamble', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    expect(screen.getByText(/AI Native Development:/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Antigravity/i)).toBeInTheDocument();
  });

  it('displays technical highlights section', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    expect(screen.getByText(/Technical Highlights/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Stack/i)).toBeInTheDocument();
    expect(screen.getByText(/RAG Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Security & Auth/i)).toBeInTheDocument();
    expect(screen.getByText(/Performance/i)).toBeInTheDocument();
  });

  it('displays technical details correctly', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    expect(screen.getByText(/Next\.js 14/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI AgentSDK/i)).toBeInTheDocument();
    expect(screen.getByText(/Vercel AI SDK/i)).toBeInTheDocument();
    expect(screen.getByText(/Clerk/i)).toBeInTheDocument();
  });

  it('contains link to documentation with correct href', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    const docsLink = screen.getByRole('link', { name: /read the docs/i });
    expect(docsLink).toHaveAttribute(
      'href',
      'https://deepwiki.com/MacAttak/ai-resume'
    );
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('contains link to GitHub with correct href', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    const githubLink = screen.getByRole('link', { name: /view on github/i });
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/MacAttak/ai-resume'
    );
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays source code section with proper heading', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    expect(
      screen.getByText(/Source Code & Documentation/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Explore the codebase and detailed technical documentation/i
      )
    ).toBeInTheDocument();
  });

  it('renders icons in buttons', async () => {
    const user = userEvent.setup();
    render(<AboutModal />);

    await user.click(
      screen.getByRole('button', { name: /about agent mccarthy/i })
    );

    const docsLink = screen.getByRole('link', { name: /read the docs/i });
    const githubLink = screen.getByRole('link', { name: /view on github/i });

    // Check that links contain SVG icons (lucide-react renders as SVG)
    expect(docsLink.querySelector('svg')).toBeInTheDocument();
    expect(githubLink.querySelector('svg')).toBeInTheDocument();
  });
});
