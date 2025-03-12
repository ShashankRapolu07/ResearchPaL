import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CSVModal.css';
import Papa from 'papaparse';
import { FixedSizeList as List } from 'react-window';
import { ring2, dotPulse } from "ldrs";

ring2.register();
dotPulse.register();

const ROW_HEIGHT = 35;

const CSVModal = ({ file, onClose, ref }) => {
  const [csvData, setCsvData] = useState([]);
  const [numColumns, setNumColumns] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const modalContentRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    setParseError(null);
    setCsvData(null);

    let fileToParse = file;
    if (!(file instanceof Blob) && file.data) {
      fileToParse = new Blob([file.data], { type: "text/csv" });
    }

    Papa.parse(fileToParse, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: false,
      delimiter: ",",
      complete: (results) => {
        setLoading(false);
        if (results.errors && results.errors.length > 0) {
          console.error("Failed to load CSV file:", results.errors);
          setParseError("Failed to load CSV file.");
          return;
        }

        let data = results.data || [];

        data = data.filter((row) => {
          return row.some((cell) => cell && cell.toString().trim() !== "");
        });

        if (data.length > 0) {
          let lastColIndex = data[0].length - 1;
          while (lastColIndex >= 0) {
            const allEmpty = data.every((row) => {
              return !row[lastColIndex] || row[lastColIndex].toString().trim() === "";
            });
            if (allEmpty) {
              data.forEach((row) => row.splice(lastColIndex, 1));
              lastColIndex--;
            } else {
              break;
            }
          }
        }

        setCsvData(data);

        if (data.length > 0) {
          setNumColumns(data[0].length);
        } else {
          setNumColumns(0);
        }
      },
      error: (err) => {
        setLoading(false);
        setParseError("Failed to load CSV file.");
      }
    });

    return () => {
      setCsvData([]);
    };
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

  const Row = useCallback(({ index, style }) => {
    const row = csvData[index] || [];
    return (
      <div className="csvmodal-virtual-row" style={style}>
        {row.map((cell, colIndex) => (
          <div className="csvmodal-virtual-cell" key={`r${index}-c${colIndex}`}>
            {String(cell)}
          </div>
        ))}
      </div>
    );
  }, [csvData]);

  return (
    <div
      ref={ref}
      className={`csvmodal-overlay ${isClosing ? 'fade-out' : 'fade-in'}`}
      onClick={handleOverlayClick}
    >
      <div className="chat-imagepreview-close-button" onClick={triggerClose}>
        ✕ 
      </div>
      
      <div
        className={`csvmodal-content ${isClosing ? 'slide-down' : 'slide-up'}`}
        ref={modalContentRef}
        >

        <div className="csvmodal-header">
          <span className="csvmodal-filename">
            {file?.name || 'Untitled.csv'}
          </span>
        </div>

        {loading && (
          <div className="csvmodal-loading-state">
            <l-ring-2 size="19" speed="0.45" stroke="3.0" color="#f7f7f7"></l-ring-2>
            <div className="csvmodal-loading-text">
                <span>Loading CSV file</span>
                <div className="csvmodal-loading-dotpulse"><l-dot-pulse size="12.5" speed="1" color="#f7f7f7"></l-dot-pulse></div>
            </div>
          </div>
        )}

        {parseError && !loading && (
          <div className="csvmodal-error-state">
            <span>{parseError}</span>
          </div>
        )}

        {!loading && !parseError && csvData.length > 0 && (
          <div className="csvmodal-table-container">
            <List
              height={450}
              itemCount={csvData.length}
              itemSize={ROW_HEIGHT}
              width={Math.min(850, Math.max(numColumns * 130, 300))}
              className="csvmodal-virtual-list"
            >
              {Row}
            </List>
          </div>
        )}

      </div>
    </div>
  );
};

export default CSVModal;