import { useState, useEffect } from 'react';
import { useToast } from '@/components/CustomToast';
import { useBills } from '@/contexts/BillsContext';
import { BillPayment } from '@/types';
import { BillModel } from '@/models/BillModel';
import { dateToTimestamp, timestampToDate, localDate } from '@/lib/dateUtils';
import { Alert } from 'react-native';

export const useBillPayments = (bill: BillModel | null, visible: boolean) => {
  const toast = useToast();
  const { loadBillPayments, addBillPayment, updateBillPayment, deleteBillPayment, markPaymentAsPaid } = useBills();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(localDate(new Date()));
  const [appliedDate, setAppliedDate] = useState('');
  const [scheduledPaymentId, setScheduledPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const loadPayments = async () => {
    if (!bill) return;

    try {
      const data = await loadBillPayments(bill.id);
      // Sort payments in reverse chronological order (newest first)
      const sortedPayments = data.sort((a, b) => {
        return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
      });
      setPayments(sortedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadScheduledPayment = () => {
    if (!bill) return;
    
    // Check for existing scheduled payment (payment_date > today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scheduledPayment = bill.payments.find(payment => {
      const paymentDate = new Date(payment.payment_date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate > today;
    });
    
    if (scheduledPayment) {
      setScheduledPaymentId(scheduledPayment.id);
      setPaymentAmount(scheduledPayment.amount.toString());
      setPaymentDate(timestampToDate(scheduledPayment.payment_date));
      setAppliedDate(scheduledPayment.applied_date ? timestampToDate(scheduledPayment.applied_date) : timestampToDate(scheduledPayment.payment_date));
    } else {
      setScheduledPaymentId(null);
      setPaymentAmount(bill.amount.toString());
      setPaymentDate(localDate(new Date()));
      setAppliedDate('');
    }
  };

  const handleAddPayment = async (onSuccess: () => void) => {
    if (!bill) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.show({ type: 'error', text1: 'Please enter a valid payment amount' });
      return;
    }

    if (!paymentDate) {
      toast.show({ type: 'error', text1: 'Please enter a payment date' });
      return;
    }

    setLoading(true);
    try {
      // Determine if payment should be marked as paid
      // If payment date is today or in the past, mark as paid
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const paymentDateObj = new Date(paymentDate);
      paymentDateObj.setHours(0, 0, 0, 0);
      const isPaid = paymentDateObj <= today;

      if (scheduledPaymentId) {
        // Update existing scheduled payment
        const { error } = await updateBillPayment(
          scheduledPaymentId,
          amount,
          dateToTimestamp(paymentDate),
          appliedDate ? dateToTimestamp(appliedDate) : undefined,
          isPaid
        );
        if (error) throw error;
        toast.show({ type: 'success', text1: 'Payment updated successfully' });
      } else {
        // Create new payment
        const { error } = await addBillPayment(
          bill.id,
          amount,
          dateToTimestamp(paymentDate),
          appliedDate ? dateToTimestamp(appliedDate) : undefined,
          isPaid
        );
        if (error) throw error;
        toast.show({ type: 'success', text1: 'Payment saved successfully' });
      }

      setShowPaymentForm(false);
      loadPayments();
      onSuccess();
    } catch (error) {
      toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, onSuccess: () => void) => {
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteBillPayment(paymentId);
            if (error) {
              toast.show({ type: 'error', text1: 'Failed to delete payment' });
            } else {
              toast.show({ type: 'success', text1: 'Payment deleted' });
              loadPayments();
              onSuccess();
            }
          },
        },
      ]
    );
  };

  const handleMarkAsPaid = async (paymentId: string, onSuccess: () => void) => {
    const { error } = await markPaymentAsPaid(paymentId);
    if (error) {
      toast.show({ type: 'error', text1: 'Failed to mark as paid' });
    } else {
      toast.show({ type: 'success', text1: 'Payment marked as paid' });
      loadPayments();
      onSuccess();
    }
  };

  const getPaymentButtonState = () => {
    if (!bill || !paymentDate) return { text: 'Make Payment', color: '#27ae60' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(dateToTimestamp(paymentDate));
    selectedDate.setHours(0, 0, 0, 0);
    
    const nextDueDate = bill.getNextDueDate();
    
    // Make Payment (green) - today or in past
    if (selectedDate <= today) {
      return { text: 'Make Payment', color: '#27ae60' };
    }
    
    // Defer Payment (orange) - beyond next due date
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > dueDate) {
        return { text: 'Defer Payment', color: '#f39c12' };
      }
    }
    
    // Schedule Payment (blue) - between now and due date
    return { text: 'Schedule', color: '#3498db' };
  };

  useEffect(() => {
    if (visible && bill) {
      loadPayments();
      setShowPaymentForm(false);
      loadScheduledPayment();
    }
  }, [visible, bill]);

  return {
    payments,
    paymentAmount,
    paymentDate,
    appliedDate,
    scheduledPaymentId,
    loading,
    showPaymentForm,
    setPaymentAmount,
    setPaymentDate,
    setAppliedDate,
    setShowPaymentForm,
    loadScheduledPayment,
    handleAddPayment,
    handleDeletePayment,
    handleMarkAsPaid,
    getPaymentButtonState,
  };
};
