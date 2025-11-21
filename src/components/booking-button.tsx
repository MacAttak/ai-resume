'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';
import { BookingModal } from './booking-modal';

export function BookingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Book a Meeting</span>
        <span className="sm:hidden">Book</span>
      </Button>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
