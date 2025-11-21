'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import Cal, { getCalApi } from '@calcom/embed-react';

interface BookingModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [isBookingStarted, setIsBookingStarted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      (async function () {
        const cal = await getCalApi({});
        cal('ui', {
          styles: { branding: { brandColor: '#000000' } },
          hideEventTypeDetails: false,
          layout: 'month_view',
        });
      })();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsBookingStarted(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a 15-Minute Meeting with Daniel</DialogTitle>
          <DialogDescription>
            {isBookingStarted ? (
              'Select a time that works for you'
            ) : (
              <>
                Quick chats for initial introductions or brief discussions. Or{' '}
                <span className="font-medium text-foreground">
                  ask me in the chat
                </span>{' '}
                to book for you!
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isBookingStarted ? (
          // Cal.com embed
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBookingStarted(false)}
              className="gap-2"
            >
              ← Back
            </Button>

            <div className="w-full min-h-[600px]">
              <Cal
                calLink="chatwithdan/15min"
                style={{ width: '100%', height: '100%', overflow: 'scroll' }}
                config={{
                  layout: 'month_view',
                  theme: 'light',
                }}
              />
            </div>
          </div>
        ) : (
          // Start booking screen
          <div className="space-y-4 py-4">
            <Button
              variant="default"
              size="lg"
              className="w-full h-auto py-6 px-6"
              onClick={() => setIsBookingStarted(true)}
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-lg">
                  View Available Times
                </div>
                <div className="text-sm opacity-90">
                  Select from Daniel's available 15-minute time slots
                </div>
              </div>
            </Button>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                💡{' '}
                <span className="font-medium text-foreground">
                  Prefer a conversational approach?
                </span>
                <br />
                Close this modal and ask me in the chat to check availability
                and book for you!
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
