import React, { useState } from "react";
import './APIDialogOverlay.css';
import CryptoJS from 'crypto-js';
import { toast } from 'sonner';

const generateRandomKey = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const APIDescription = ({ company, openSourceLink = "https://github.com/ShashankRapolu07/ResearchPaL" }) => {
    const apiDocsLinks = {
        OpenAI: "https://openai.com/api/",
        Anthropic: "https://www.anthropic.com/api",
        Google: "https://ai.google.dev/pricing#1_5flash",
        Groq: "https://console.groq.com/settings/billing",
        Adobe: "https://developer.adobe.com/document-services/pricing/main/"
    };

    return (
      company === "Adobe" ? (
        <div className="apidescription-container">
          <h2 className="apidescription-title">
            Why We Ask for Your API Key and How We Handle It
          </h2>
          <p className="apidescription-text">
            To enable <strong>Advanced Parsing</strong>, you may provide your own <a href={apiDocsLinks[company]} target="_blank" rel="noopener noreferrer">{company} Extract API key</a>. Here's exactly how we handle your credentials with the utmost care and transparency:
          </p>
          <ul className="apidescription-list">
            <li>
              <strong>Local Storage Only:</strong> Your Adobe keys are <strong>encrypted</strong> and securely stored on your local machine. They are <strong>never saved on our servers</strong>.
            </li>
            <li>
              <strong>Strictly Optional Use (but Recommended):</strong> Your Adobe keys are <u>only used</u> if you choose to perform <strong>Advanced Parsing</strong>. Without your consent, they will <strong>never leave your device</strong>.
              <ul>
                <li style={{ marginLeft: '20px' }}>
                  <strong>Free Limits:</strong> Free version is <strong>limited</strong> and shared across all users. We recommend using your own keys if you reach this limit.
                </li>
              </ul>
            </li>
            <li>
              <strong>Secure Transmission:</strong> When Advanced Parsing, your credentials are transmitted to Adobe's servers securely and used <u>solely</u> for the extraction task. Once completed, they are <strong>immediately discarded</strong>.
            </li>
            <li>
              <strong>Complete Privacy Assurance:</strong> We never store your credentials. They are used <u>solely</u> in-session and erased immediately afterward.
            </li>
            <li>
              <strong>Open Source Transparency:</strong> We believe in transparency. Our entire application code is <strong>open-sourced</strong>, allowing you to verify precisely how your Adobe keys are handled. Review it yourself <a href={openSourceLink} target="_blank" rel="noopener noreferrer">here</a>.
            </li>
          </ul>
        </div>
      ) : company === "Google" ? (
        <div className="apidescription-container">
          <h2 className="apidescription-title">
            Why We Ask for Your API Key and How We Handle It
          </h2>
          <p className="apidescription-text">
            To access language models from <strong>{company}</strong>, you will need to provide your own <a href={apiDocsLinks[company]} target="_blank" rel="noopener noreferrer">{company} API key</a>. Rest assured, your Google API key is handled with the utmost care and transparency:
          </p>
          <ul className="apidescription-list">
            <li>
              <strong>Local Storage Only:</strong> Your <u>Google API key</u> is <strong>encrpyted</strong> and securely stored on your local machine. It is never saved on our servers.
            </li>
            <li>
              <strong>Client-Side Usage Only (Except for Advanced Parsing):</strong> Your <u>Google API key</u> is never sent to our servers unless you explicitly choose to perform <strong>Advanced Parsing</strong>. In that case, it is <strong>securely</strong> transmitted <u>solely</u> for the parsing task and immediately omitted after processing.
            </li>
            <li>
              <strong>Minimal Server Communication:</strong> All LangChain agent calls occur directly on your device. Your <u>Google API key</u> <strong>never leaves your local environment</strong> unless you opt for Advanced Parsing as described above.
            </li>
            <li>
            <strong>Complete Privacy & Security:</strong> We do not store any of your details at all, ensuring highest-level of privacy and security.
            </li>
            <li>
              <strong>You're in Control:</strong> Advanced Parsing is <strong>entirely optional</strong>. Without your consent, your <u>Google API key</u> will not be used for it.
            </li>
            <li>
              <strong>Open Source Transparency:</strong> To foster trust, we <strong>open-sourced</strong> our application code. You can review it yourself <a href={openSourceLink} target="_blank" rel="noopener noreferrer">here</a> to see exactly how your <u>Google API key</u> is handled and verify that your data is secure.
            </li>
          </ul>
        </div>
      ) : (
        <div className="apidescription-container">
          <h2 className="apidescription-title">
            Why We Ask for Your API Key and How We Handle It
          </h2>
          <p className="apidescription-text">
            To access language models from <strong>{company}</strong>, you will need to provide your own <a href={apiDocsLinks[company]} target="_blank" rel="noopener noreferrer">{company} API key</a>. Rest assured, your API key is handled with the utmost care and transparency:
          </p>
          <ul className="apidescription-list">
            <li>
              <strong>Local Storage Only:</strong> Your API key is <strong>encrypted</strong> and securely stored on your local machine only. It is never saved on our servers.
            </li>
            <li>
              <strong>Client-Side Usage Only:</strong> Your API key is <strong>never sent to our servers</strong>. It remains securely on your device at all times and is used <u>solely</u> for <strong>LangChain authentication</strong>.
            </li>
            <li>
              <strong>Minimal Server Communication:</strong> All LangChain agent calls occur directly on your device. Your API key <strong>never leaves your local environment</strong> at any point.
            </li>
            <li>
              <strong>Complete Privacy & Security:</strong> We do not store any of your details at all, ensuring highest-level of privacy and security.
            </li>
            <li>
              <strong>Open Source Transparency:</strong> To foster trust, we <strong>open-sourced</strong> our application code. You can review it yourself <a href={openSourceLink} target="_blank" rel="noopener noreferrer">here</a> to see exactly how your API key is handled and verify that it is secure.
            </li>
          </ul>
        </div>
      )
    );
  };

const APIDialogBox = ({
  company,
  localEncryptionKey,
  storeLocalEncryptionKey,
  toggleShowAPIDialogBox,
  toggleSetCurrentLLM,
  toggleSetCurrentLLMAPIKey,
  toggleLLMOptions,
  tempLLMOptionChosenByLLMOptionsExtension,
  toggleModifyHasAPIKey,
  toggleShowParseOptions
}) => {
    const [apiKey, setAPIKey] = useState("");
    const [adobeClientID, setAdobeClientID] = useState("");
    const [adobeClientSecret, setAdobeClientSecret] = useState("");

    const titles = {
        OpenAI: "Provide your OpenAI Key",
        Anthropic: "Provide your Anthropic Key",
        Google: "Provide your Google Key",
        Groq: "Provide your Groq Key",
        Adobe: "Provide your Adobe Key"
    }

    const descriptions = {
        OpenAI: <APIDescription company={"OpenAI"} />,
        Anthropic: <APIDescription company={"Anthropic"} />,
        Google: <APIDescription company={"Google"} />,
        Groq: <APIDescription company={"Groq"} />,
        Adobe: <APIDescription company={"Adobe"} />
    }

    const handleEncryptAndSave = () => {
      if (company === "Adobe") {
        if (adobeClientID.trim() === "" || adobeClientSecret.trim() === "") {
          toast.error("Please enter valid Adobe credentials");
          return;
        }
      } else {
        if (apiKey.trim() === "") {
          toast.error("Please enter a valid API key");
          return;
        }
      }
  
      const encryptionKeyToUse =
        localEncryptionKey && localEncryptionKey.length === 32
          ? localEncryptionKey
          : generateRandomKey(32);

      storeLocalEncryptionKey(encryptionKeyToUse);
  
      try {
        if (company === "Adobe") {
          const encryptedAdobeClientID = CryptoJS.AES.encrypt(adobeClientID, encryptionKeyToUse).toString();
          const encryptedAdobeClientSecret = CryptoJS.AES.encrypt(adobeClientSecret, encryptionKeyToUse).toString();
          sessionStorage.setItem("Adobe-CLIENT-ID", encryptedAdobeClientID);
          sessionStorage.setItem("Adobe-CLIENT-SECRET", encryptedAdobeClientSecret);

          toggleShowParseOptions();
        } else {
          const encryptedKey = CryptoJS.AES.encrypt(apiKey, encryptionKeyToUse).toString();
          sessionStorage.setItem(`${company}-API-Key`, encryptedKey);

          toggleSetCurrentLLM(tempLLMOptionChosenByLLMOptionsExtension);
          toggleSetCurrentLLMAPIKey(apiKey);
          toggleLLMOptions();
        }
        toggleModifyHasAPIKey(company);
        toggleShowAPIDialogBox(null);
  
        setTimeout(() => {
          if (company === "Adobe") {
            toast.message("Adobe credentials saved securely", {
              description: "Go to \"Choose Parser\" -> \"Advanced\" to start parsing"
            });
          } else {
            toast.message(`${company} API key saved securely`, {
              description: "Avoid refreshing the page, or you'll need to re-enter all your credentials."
            });
          }
        }, 300);
      } catch (error) {
        toast.error("Some error occurred. Please try again.");
        console.error(error);
      }
    };

    return (
        <div className="apidialogbox-main-container">
            <div className="apidialogbox-title-container">
                <span>{titles[company]}</span>
            </div>
            <div className="apidialogbox-description-container">{descriptions[company]}</div>
            <div className={`transition-container ${company === "Adobe" ? 'adobe' : ''}`}>
              <div className={`apidialogbox-submit-container ${company === "Adobe" ? 'adobe' : ''}`}>
                {
                  company === "Adobe" ? (
                    <input
                      type="text"
                      placeholder="Provide your Adobe Client ID here"
                      value={adobeClientID}
                      onChange={(e) => setAdobeClientID(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEncryptAndSave();
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Provide your API key here"
                      value={apiKey}
                      onChange={(e) => setAPIKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEncryptAndSave();
                        }
                      }}
                    />
                  )
                }
                {
                  company === "Adobe" ? (
                    <input
                      type="text"
                      placeholder="Provide your Adobe Client Secret here"
                      value={adobeClientSecret}
                      onChange={(e) => setAdobeClientSecret(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEncryptAndSave();
                        }
                      }}
                    />
                  ) : null
                }
                {localEncryptionKey && company !== "Adobe" ? (
                  <div className={`encryptionkey-detected-container ${company === "Adobe" ? 'adobe' : ''}`}>
                    <span>Encryption key already detected in memory.</span>
                  </div>
                ) : null}
                <div
                  className={`apidialogbox-encrypt-button ${company === "Adobe" ? 'adobe' : ''}`}
                  onClick={handleEncryptAndSave}
                >
                  <span>Encrypt and Save for this Session</span>
                </div>
              </div>
            </div>
        </div>
    );
};

const APIDialogOverlay = ({
  showAPIDialogBox,
  localEncryptionKey,
  toggleShowAPIDialogBox,
  storeLocalEncryptionKey,
  toggleSetCurrentLLM,
  toggleSetCurrentLLMAPIKey,
  toggleLLMOptions,
  tempLLMOptionChosenByLLMOptionsExtension,
  toggleModifyHasAPIKey,
  toggleShowParseOptions
}) => {
    return (
        <div className="api-dialog-overlay" onClick={() => toggleShowAPIDialogBox(null)}>
            <div className="api-dialog-content" onClick={e => e.stopPropagation()}>
            {showAPIDialogBox === "OpenAI" ? (
                <APIDialogBox
                  company="OpenAI"
                  localEncryptionKey={localEncryptionKey}
                  storeLocalEncryptionKey={storeLocalEncryptionKey}
                  toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                  toggleSetCurrentLLM={toggleSetCurrentLLM}
                  toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                  toggleLLMOptions={toggleLLMOptions}
                  tempLLMOptionChosenByLLMOptionsExtension={tempLLMOptionChosenByLLMOptionsExtension}
                  toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                />
            ) : showAPIDialogBox === "Anthropic" ? (
              <APIDialogBox
                company="Anthropic"
                localEncryptionKey={localEncryptionKey}
                storeLocalEncryptionKey={storeLocalEncryptionKey}
                toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                toggleSetCurrentLLM={toggleSetCurrentLLM}
                toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                toggleLLMOptions={toggleLLMOptions}
                tempLLMOptionChosenByLLMOptionsExtension={tempLLMOptionChosenByLLMOptionsExtension}
                toggleModifyHasAPIKey={toggleModifyHasAPIKey}
              />
            ) : showAPIDialogBox === "Google" ? (
              <APIDialogBox
                company="Google"
                localEncryptionKey={localEncryptionKey}
                storeLocalEncryptionKey={storeLocalEncryptionKey}
                toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                toggleSetCurrentLLM={toggleSetCurrentLLM}
                toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                toggleLLMOptions={toggleLLMOptions}
                tempLLMOptionChosenByLLMOptionsExtension={tempLLMOptionChosenByLLMOptionsExtension}
                toggleModifyHasAPIKey={toggleModifyHasAPIKey}
              />
            ) : showAPIDialogBox === "Groq" ? (
              <APIDialogBox
                company="Groq"
                localEncryptionKey={localEncryptionKey}
                storeLocalEncryptionKey={storeLocalEncryptionKey}
                toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                toggleSetCurrentLLM={toggleSetCurrentLLM}
                toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                toggleLLMOptions={toggleLLMOptions}
                tempLLMOptionChosenByLLMOptionsExtension={tempLLMOptionChosenByLLMOptionsExtension}
                toggleModifyHasAPIKey={toggleModifyHasAPIKey}
              />
            ) : showAPIDialogBox === "Adobe" ? (
              <APIDialogBox
                  company="Adobe"
                  localEncryptionKey={localEncryptionKey}
                  storeLocalEncryptionKey={storeLocalEncryptionKey}
                  toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                  toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                  toggleShowParseOptions={toggleShowParseOptions}
                />
            ) : null}
            </div>
        </div>
    );
}

export default APIDialogOverlay;