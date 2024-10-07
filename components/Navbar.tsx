'use client';

import { AvatarIcon } from '@radix-ui/react-icons';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/auth-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Link from 'next/link';
import { Button } from './ui/button';
import React, { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import ClientSideCredits from './realtime/ClientSideCredits';
import Modal from './Modal';

import { creditsRow } from '@/types/utils';

const stripeIsConfigured = process.env.NEXT_PUBLIC_STRIPE_IS_ENABLED === 'true';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<creditsRow | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    async function fetchUserAndCredits() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user || null);

      if (user) {
        const { data: creditsData } = await supabase
          .from('credits')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setCredits(creditsData);
      }
    }

    fetchUserAndCredits();
  }, [supabase]);

  return (
    <div className="flex w-full px-4 lg:px-40 py-4 items-center border-b text-center gap-8 justify-between">
      <div className="flex gap-2 h-full">
        <Link href="/">
          <h2 className="font-bold">Headshots AI</h2>
        </Link>
      </div>
      {user && (
        <div className="hidden lg:flex flex-row gap-2">
          <Link href="/overview">
            <Button variant={'ghost'}>Home</Button>
          </Link>
          {stripeIsConfigured && (
            <Link href="/get-credits">
              <Button variant={'ghost'}>Get Credits</Button>
            </Link>
          )}
        </div>
      )}
      <div className="flex gap-4 lg:ml-auto">
        {!user && (
          <Link href="/login">
            <Button variant={'ghost'}>Login / Signup</Button>
          </Link>
        )}
        {user && (
          <div className="flex flex-row gap-4 text-center align-middle justify-center">
            {stripeIsConfigured && <ClientSideCredits creditsRow={credits} />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <AvatarIcon height={24} width={24} className="text-primary" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel className="text-primary text-center overflow-hidden text-ellipsis">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DeleteAccountButton />
                <form action="/auth/sign-out" method="post">
                  <Button type="submit" className="w-full text-left" variant={'ghost'}>
                    Log out
                  </Button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteAccountButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="w-full text-left" variant={'ghost'}>
        Delete Account
      </Button>

      <Modal isOpen={showModal} title="Delete Account" onClose={() => setShowModal(false)}>
        <p className="mb-4">
          Are you sure you want to delete your account? This action cannot be undone and you will
          lose all your data and credits.
        </p>
        <div className="flex justify-end space-x-2">
          <Button onClick={() => setShowModal(false)} variant="outline">
            Cancel
          </Button>
          <form action="/auth/delete-account" method="post">
            <input type="hidden" name="_method" value="delete" />
            <Button type="submit" variant="destructive">
              Delete Account
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
