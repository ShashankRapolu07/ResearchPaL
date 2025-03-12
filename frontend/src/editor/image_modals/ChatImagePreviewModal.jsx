import React, { useState, useEffect } from 'react';
import './ChatImagePreviewModal.css';

const ChatImagePreviewModal = ({ imageObj, onClose, ref }) => {
  const [animationState, setAnimationState] = useState("idle");

  const initiateClose = () => {
    setAnimationState('exiting');
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleModalContentClick = () => {
    initiateClose();
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    if (!imageObj) return;
    const timer = requestAnimationFrame(() => setAnimationState('entering'));

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      cancelAnimationFrame(timer);
    };
  }, [imageObj]);

  if (!imageObj) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={`chat-imagepreview-modal-backdrop ${animationState}`}
    >
      <div
        className={`chat-imagepreview-modal-content ${animationState}`}
        onClick={handleModalContentClick}
      >
        <div className="chat-imagepreview-close-button" onClick={initiateClose}>
          ✕ 
        </div>

        <div className="chat-imagepreview-image-wrapper">
          <img
            src={imageObj.url}
            alt={imageObj.file ? imageObj.file.name : 'User Preview'}
            className="chat-imagepreview-img"
            onClick={handleImageClick}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatImagePreviewModal;