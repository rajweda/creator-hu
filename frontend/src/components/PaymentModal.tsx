import React, { useState, useEffect } from 'react';
import './PaymentModal.css';

interface Video {
  id: number;
  title: string;
  price: number;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  channelTitle?: string;
  creator: {
    id: number;
    name: string;
    displayName?: string;
  };
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onPaymentSuccess: (videoId: number) => void;
}

interface PaymentDetails {
  transactionId: string;
  paymentUrl: string;
  qrCode: string;
  expiresAt: string;
  amount: number;
  platformFee: number;
  creatorEarning: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  video,
  onPaymentSuccess
}) => {
  const [step, setStep] = useState<'confirm' | 'payment' | 'verifying' | 'success' | 'error'>('confirm');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setPaymentDetails(null);
      setError(null);
      setTimeLeft(0);
      setTransactionId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentDetails && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError('Payment session expired. Please try again.');
            setStep('error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentDetails, timeLeft]);

  const initiatePayment = async () => {
    if (!video) return;

    try {
      setStep('payment');
      setError(null);

      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ videoId: video.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setPaymentDetails({
        transactionId: data.payment.transactionId,
        paymentUrl: data.payment.paymentUrl,
        qrCode: data.payment.qrCode,
        expiresAt: data.payment.expiresAt,
        amount: data.transaction.amount,
        platformFee: data.transaction.platformFee,
        creatorEarning: data.transaction.creatorEarning
      });
      
      setTransactionId(data.transaction.id);
      
      // Calculate time left in seconds
      const expiresAt = new Date(data.payment.expiresAt).getTime();
      const now = Date.now();
      const timeLeftSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(timeLeftSeconds);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
      setStep('error');
    }
  };

  const verifyPayment = async () => {
    if (!transactionId) return;

    try {
      setStep('verifying');
      setError(null);

      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setTimeout(() => {
          onPaymentSuccess(video!.id);
          onClose();
        }, 2000);
      } else {
        throw new Error(data.error || 'Payment verification failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed');
      setStep('error');
    }
  };

  const handleUPIPayment = () => {
    if (paymentDetails?.paymentUrl) {
      window.open(paymentDetails.paymentUrl, '_blank');
      // Start verification process after a short delay
      setTimeout(() => {
        verifyPayment();
      }, 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    return `₹${numPrice.toFixed(0)}`;
  };

  const getSafePrice = (price: number | string | null | undefined) => {
    return typeof price === 'string' ? parseFloat(price) : (price || 0);
  };

  if (!isOpen || !video) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={e => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Purchase Video</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="payment-modal-content">
          {step === 'confirm' && (
            <div className="payment-step">
              <div className="video-info">
                <h3>{video.title}</h3>
                <p className="creator-name">
                  by {video.creator.displayName || video.creator.name}
                </p>
                <div className="price-breakdown">
                  <div className="price-row">
                    <span>Video Price:</span>
                    <span className="price">{formatPrice(video.price)}</span>
                  </div>
                  <div className="price-row platform-fee">
                    <span>Platform Fee (15%):</span>
                    <span>₹{(getSafePrice(video.price) * 0.15).toFixed(0)}</span>
                  </div>
                  <div className="price-row creator-earning">
                    <span>Creator Earning:</span>
                    <span>₹{(getSafePrice(video.price) * 0.85).toFixed(0)}</span>
                  </div>
                  <div className="price-row total">
                    <span>Total Amount:</span>
                    <span className="price">{formatPrice(video.price)}</span>
                  </div>
                </div>
              </div>
              
              <div className="payment-info">
                <div className="info-item">
                  <span className="icon">🔒</span>
                  <span>Secure UPI Payment</span>
                </div>
                <div className="info-item">
                  <span className="icon">⚡</span>
                  <span>Instant Access</span>
                </div>
                <div className="info-item">
                  <span className="icon">📱</span>
                  <span>Ad-free Viewing</span>
                </div>
              </div>

              <button className="proceed-button" onClick={initiatePayment}>
                Proceed to Payment
              </button>
            </div>
          )}

          {step === 'payment' && paymentDetails && (
            <div className="payment-step">
              <div className="payment-header">
                <h3>Complete Payment</h3>
                <div className="timer">
                  Time remaining: <span className="time">{formatTime(timeLeft)}</span>
                </div>
              </div>

              <div className="payment-methods">
                <div className="qr-section">
                  <h4>Scan QR Code</h4>
                  <div className="qr-code">
                    <img src={paymentDetails.qrCode} alt="UPI QR Code" />
                  </div>
                  <p className="qr-instruction">
                    Scan with any UPI app to pay {formatPrice(paymentDetails.amount)}
                  </p>
                </div>

                <div className="divider">
                  <span>OR</span>
                </div>

                <div className="upi-section">
                  <h4>Pay with UPI App</h4>
                  <button className="upi-button" onClick={handleUPIPayment}>
                    <span className="upi-icon">📱</span>
                    Open UPI App
                  </button>
                  <p className="upi-instruction">
                    Click to open your default UPI app
                  </p>
                </div>
              </div>

              <div className="payment-actions">
                <button className="verify-button" onClick={verifyPayment}>
                  I've Completed Payment
                </button>
                <button className="cancel-button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="payment-step">
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>Verifying Payment</h3>
                <p>Please wait while we confirm your payment...</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="payment-step">
              <div className="success-state">
                <div className="success-icon">✅</div>
                <h3>Payment Successful!</h3>
                <p>You now have access to <strong>{video.title}</strong></p>
                <p className="redirect-message">Redirecting to video...</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="payment-step">
              <div className="error-state">
                <div className="error-icon">❌</div>
                <h3>Payment Failed</h3>
                <p className="error-message">{error}</p>
                <div className="error-actions">
                  <button className="retry-button" onClick={() => setStep('confirm')}>
                    Try Again
                  </button>
                  <button className="cancel-button" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;