import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PyModal.css';
import { ring2, dotPulse } from "ldrs";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

ring2.register();
dotPulse.register();

SyntaxHighlighter.registerLanguage('python', python);

const LINES_THRESHOLD = 2000;
const CHUNK_SIZE = 100;
const CODE_THEME = atomOneDark

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

const PyModal = ({ file, onClose }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const modalContentRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    setParseError(null);
    setContent("");

    const reader = new FileReader();
    reader.onload = (e) => {
        setLoading(false);
        setContent(e.target.result);
      };
    reader.onerror = () => {
      setParseError("Failed to load Python file.");
      setLoading(false);
    };
    reader.readAsText(file);
  }, [file]);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 100);
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      triggerClose();
    }
  };

  const lines = content ? content.split(/\r?\n/) : [];
  const linesCount = lines.length;

  let chunks = [];
  let useChunking = linesCount > LINES_THRESHOLD;
  if (useChunking) {
    chunks = chunkArray(lines, CHUNK_SIZE);
  }

  return (
    <div
      className={`pymodal-overlay ${isClosing ? 'fade-out' : 'fade-in'}`}
      onClick={handleOverlayClick}
    >
      <div className="chat-imagepreview-close-button" onClick={triggerClose}>
        ✕ 
      </div>
      
      <div
        className={`pymodal-content ${isClosing ? 'slide-down' : 'slide-up'}`}
        ref={modalContentRef}
      >
        <div className="pymodal-header">
          <span className="pymodal-filename">
            {file?.name || 'Untitled.py'}
          </span>
        </div>

        {loading && (
          <div className="pymodal-loading-state">
            <l-ring-2 size="19" speed="0.45" stroke="3.0" color="#f7f7f7"></l-ring-2>
            <div className="pymodal-loading-text">
              <span>Loading Python file</span>
              <div className="pymodal-loading-dotpulse">
                <l-dot-pulse size="12.5" speed="1" color="#f7f7f7"></l-dot-pulse>
              </div>
            </div>
          </div>
        )}

        {parseError && !loading && (
          <div className="pymodal-error-state">
            <span>{parseError}</span>
          </div>
        )}

        {!loading && !parseError && content && (
            <div className='pymodal-code-container-wrapper'>
                <div className="pymodal-code-container">
                    {!useChunking && (
                    <SyntaxHighlighter
                        language="python"
                        style={CODE_THEME}
                        customStyle={{ margin: 0, backgroundColor: 'transparent', overflowX: 'visible' }}
                        showLineNumbers
                    >
                        {content}
                    </SyntaxHighlighter>
                    )}
                    {useChunking && (
                    <>
                        {chunks.map((linesBlock, idx) => {
                        const blockText = linesBlock.join('\n');
                        return (
                            <SyntaxHighlighter
                            key={idx}
                            language="python"
                            style={CODE_THEME}
                            customStyle={{ margin: 0, backgroundColor: 'transparent' }}
                            showLineNumbers
                            >
                            {blockText}
                            </SyntaxHighlighter>
                        );
                        })}
                    </>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PyModal;