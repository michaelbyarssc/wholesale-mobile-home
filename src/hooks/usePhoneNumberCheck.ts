
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePhoneNumberCheck = () => {
  const [needsPhoneNumber, setNeedsPhoneNumber] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPhoneNumber = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking phone number:', error);
        setLoading(false);
        return;
      }

      // Check if phone number is missing or empty
      const missingPhone = !profile?.phone_number || profile.phone_number.trim() === '';
      setNeedsPhoneNumber(missingPhone);
      setShowPhoneDialog(missingPhone);
      
    } catch (error) {
      console.error('Error in phone number check:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPhoneNumber();
  }, []);

  const handlePhoneAdded = () => {
    setNeedsPhoneNumber(false);
    setShowPhoneDialog(false);
  };

  const handleCloseDialog = () => {
    setShowPhoneDialog(false);
  };

  return {
    needsPhoneNumber,
    showPhoneDialog,
    loading,
    handlePhoneAdded,
    handleCloseDialog,
  };
};
