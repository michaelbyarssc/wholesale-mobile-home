import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreatedByDisplayProps {
  createdBy: string | null;
  className?: string;
}

export const CreatedByDisplay = ({ createdBy, className = '' }: CreatedByDisplayProps) => {
  const [createdByName, setCreatedByName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatedByName();
  }, [createdBy]);

  const fetchCreatedByName = async () => {
    if (!createdBy) {
      setCreatedByName('Self-registered');
      setLoading(false);
      return;
    }

    try {
      const { data: creatorProfile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', createdBy)
        .maybeSingle();

      if (error) {
        console.error('Error fetching creator profile:', error);
        setCreatedByName('Unknown');
        setLoading(false);
        return;
      }

      if (creatorProfile) {
        const name = `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim();
        setCreatedByName(name || creatorProfile.email || 'Unknown');
      } else {
        setCreatedByName('Unknown');
      }
    } catch (error) {
      console.error('Error in fetchCreatedByName:', error);
      setCreatedByName('Unknown');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <span className={className}>Loading...</span>;
  }

  return <span className={className}>{createdByName}</span>;
};