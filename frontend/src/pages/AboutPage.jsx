import React from "react";
import { FaSearchPlus, FaRobot } from "react-icons/fa";
import { MdOutlineAutoGraph, MdOutlineFreeBreakfast } from "react-icons/md";
import { BsTable, BsFillLightbulbFill } from "react-icons/bs";
import logogif2 from '../assets/gifs/logo2.gif';
import APIKeyHandlingImage1 from '../assets/images/API Key Handling 1.png';
import APIKeyHandlingImage2 from '../assets/images/API Key Handling 2.png';
import APIKeyHandlingImage3 from '../assets/images/API Key Handling 3.png';
import AskAIAgentImage1 from '../assets/images/ask ai agent 1.png';
import AskAIAgentImage2 from '../assets/images/ask ai agent 2.png';
import CitationModeYesImage from '../assets/images/Citation Mode yes.png';
import CitationModeNoImage from '../assets/images/Citation Mode no.png';
import FollowUpSuggestionsImage from '../assets/images/Follow-up Suggestions.png';
import RetrievalQualityEnhancerModeImage from '../assets/images/Retrieval Quality Enhancer Mode.png';
import "./AboutPage.css";

const AboutPage = () => {
  return (
    <div className="about-page">
      <header className="aboutpage-hero-section">
        <div className="aboutpage-hero-content">
          <div className="aboutpage-hero-title">
            <img src={logogif2} alt="ResearchPaL Logo" className="aboutpage-hero-logo-image" />
            <h1>ResearchPaL</h1>
          </div>
          <p className="aboutpage-tagline">Your AI-powered Multi-Agentic Research Copilot</p>
        </div>
      </header>

      <section className="aboutpage-intro-section">
        <div className="aboutpage-container">
          <div className="aboutpage-header">
            <h2>What is ResearchPaL?</h2>
          </div>
          <div className="aboutpage-intro-content">
            <div className="aboutpage-intro-text">
              <p>
                <strong>ResearchPaL</strong> is an intelligent AI-powered research assistant, 
                designed to help you navigate complex academic papers effortlessly. Equipped with 
                cutting-edge <strong>multi-agent AI</strong> technology, ResearchPaL can read and analyze 
                research papers for you, delivering clear, concise answers to your questions.
              </p>
              <p>
                Unlike traditional AI tools, it doesn't just process text—it also understands 
                <strong> figures and tables</strong>, making it a truly multi-modal assistant. 
                Whether you're a researcher, student, or professional, ResearchPaL ensures you 
                <strong> grasp academic papers in minutes rather than hours</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="aboutpage-features-section">
        <div className="aboutpage-container">
          <div className="aboutpage-header">
            <h2>Why you might need ResearchPaL</h2>
          </div>
          <p className="aboutpage-section-description">
            The AI research landscape is evolving rapidly, with groundbreaking papers emerging 
            <strong> every week</strong>. Keeping up with this flood of information is overwhelming, 
            if not impossible, for a single person. <strong>ResearchPaL is built to solve this problem.</strong>
          </p>
          
          <div className="aboutpage-features-grid">
            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <BsFillLightbulbFill />
              </div>
              <h3>Instant Paper Summarization</h3>
              <p>Get key insights without reading the full paper.</p>
            </div>

            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <FaSearchPlus />
              </div>
              <h3>In-depth Paper Analysis</h3>
              <p>Dig deeper into research papers with detailed analysis of methods and findings.</p>
            </div>
            
            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <BsTable />
              </div>
              <h3>Understanding Beyond Text</h3>
              <p>ResearchPaL extracts figures and tables, allowing for a richer, more accurate understanding.</p>
            </div>
            
            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <FaRobot />
              </div>
              <h3>Advanced AI Agents</h3>
              <p>Leverage AI agents for paper analysis, insightful answers, and seamless paper navigation.</p>
            </div>
            
            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <MdOutlineAutoGraph />
              </div>
              <h3>Stay Updated Effortlessly</h3>
              <p>No need to manually sift through long papers—ResearchPaL distills the most relevant information for you.</p>
            </div>

            <div className="aboutpage-feature-card">
              <div className="aboutpage-feature-icon">
                <MdOutlineFreeBreakfast />
              </div>
              <h3>100% Free Service</h3>
              <p>Access research tools and features to full-extent using your own API keys with no extra service charges.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="aboutpage-architecture-section">
        <div className="aboutpage-container">
          <div className="aboutpage-header">
            <h2>Parsing Modes</h2>
          </div>
          <div className="aboutpage-parsing-modes">
            <div className="aboutpage-parsing-mode">
              <h4>Default Parsing</h4>
              <p>Supports text-based paper contents but does not directly have access to figures or tables.</p>
            </div>
            
            <div className="aboutpage-parsing-mode">
              <h4>Advanced Parsing</h4>
              <p>Grants direct access to figures and tables within the paper, making explanations significantly more reliable.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="aboutpage-security-section">
        <div className="aboutpage-container">
          <h1>🔐 How Your API Keys Are Handled</h1>
          <div className="aboutpage-security-content">
            <div className="aboutpage-security-text">
              <p>
                User security and privacy are top priorities. Your API keys are <strong>never stored on our servers</strong>—instead, 
                they are <strong>securely encrypted and stored locally on your machine</strong>.
              </p>
              
              <ul className="aboutpage-security-features">
                <li><strong>Local Storage Only:</strong> Your API keys remain on your device and are never transmitted to external servers.</li>
                <li><strong>End-to-End Encryption:</strong> Every key is securely encrypted, ensuring maximum protection.</li>
                <li><strong>Minimal Server Communication:</strong> All AI agent calls are processed directly on your machine, meaning your keys <strong>never leave your local environment</strong>.</li>
                <li><strong>Full Transparency:</strong> ResearchPaL is <strong>open-source</strong>, allowing you to verify how your API keys are handled. Check out the code <a href="https://github.com/ShashankRapolu07/ResearchPaL" target="_blank" rel="noopener noreferrer">here</a>.</li>
              </ul>
            </div>
            
            <div className="aboutpage-api-keys-handling">
              <h4>How We Handle Your API Keys:</h4>
              <div className="aboutpage-api-keys-images">
                <div className="aboutpage-api-key-image">
                  <p>OpenAI/Anthropic/Groq</p>
                  <img src={APIKeyHandlingImage1} alt="API Key Handling - OpenAI/Anthropic/Groq" />
                </div>
                
                <div className="aboutpage-api-key-image">
                  <p>Google</p>
                  <img src={APIKeyHandlingImage2} alt="API Key Handling - Google" />
                </div>
                
                <div className="aboutpage-api-key-image">
                  <p>Adobe</p>
                  <img src={APIKeyHandlingImage3} alt="API Key Handling - Adobe" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="aboutpage-key-features-section">
        <div className="aboutpage-container">
          <h1>Key Features of ResearchPaL</h1>
          
          <div className="aboutpage-feature-blocks">
            <div className="aboutpage-feature-block">
              <div className="aboutpage-feature-header">
                <div className="aboutpage-feature-number">1️⃣</div>
                <h3>Ask AI Agent – Quickly Decide If a Paper Is Worth Reading</h3>
              </div>
              
              <div className="aboutpage-feature-description">
                <p>
                  <em>Not sure if a paper is worth reading?</em> <strong>Ask AI Agent</strong> provides a 
                  <strong> quick, high-level summary</strong> of any research paper, helping you grasp its core ideas 
                  <strong> in seconds</strong>. This feature lets you decide whether the paper is relevant to your 
                  needs—saving you <strong>hours of reading time</strong>.
                </p>
                
                <div className="aboutpage-feature-images">
                  <div className="aboutpage-feature-image">
                    <p>Empty State</p>
                    <img src={AskAIAgentImage2} alt="Ask AI Agent - Empty State" />
                  </div>
                  
                  <div className="aboutpage-feature-image">
                    <p>After Query</p>
                    <img src={AskAIAgentImage1} alt="Ask AI Agent - After Query" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="aboutpage-feature-block">
              <div className="aboutpage-feature-header">
                <div className="aboutpage-feature-number">2️⃣</div>
                <h3>Citation Mode – Authenticity at Its Best</h3>
              </div>
              
              <div className="aboutpage-feature-description">
                <p>
                  <em>Not sure about authenticity of <strong>ResearchPaL's</strong> explanations?</em> 
                  <strong> Citation Mode</strong> ensures that generated responses include <strong>direct quotes</strong> from the paper, 
                  giving you <strong>credible, verifiable answers</strong>. Use this feature when authenticity is critical!
                </p>
                
                <div className="aboutpage-feature-images">
                  <div className="aboutpage-feature-image">
                    <p>Normal Mode</p>
                    <img src={CitationModeNoImage} alt="Citation Mode - Normal Mode" />
                  </div>
                  
                  <div className="aboutpage-feature-image">
                    <p>Citation Mode</p>
                    <img src={CitationModeYesImage} alt="Citation Mode - Citation Mode" />
                  </div>
                </div>
                
                <p className="aboutpage-feature-note">No additional token usage or API requests are consumed by the <strong>Citation mode</strong>.</p>
              </div>
            </div>
            
            <div className="aboutpage-feature-block">
              <div className="aboutpage-feature-header">
                <div className="aboutpage-feature-number">3️⃣</div>
                <h3>Follow-Up Suggestions – Navigate Papers Like a Pro</h3>
              </div>
              
              <div className="aboutpage-feature-description">
                <p>
                  <em>Need proper guidance through the paper?</em> <strong>Follow-Up Suggestions</strong> provide 
                  <strong> smart, context-aware prompts</strong> to help you <strong>explore deeper insights</strong> without missing key details. 
                  This feature enhances your research journey by guiding you through the paper efficiently.
                </p>
                
                <div className="aboutpage-feature-image-single">
                  <img src={FollowUpSuggestionsImage} alt="Follow-up Suggestions" />
                </div>
                
                <p className="aboutpage-feature-note">Incurs additional token usage and +1 API request.</p>
              </div>
            </div>
            
            <div className="aboutpage-feature-block">
              <div className="aboutpage-feature-header">
                <div className="aboutpage-feature-number">4️⃣</div>
                <h3>Retrieval Quality Enhancer Mode – Unlock Deeper Insights</h3>
              </div>
              
              <div className="aboutpage-feature-description">
                <p>
                  <em>Need a detailed explanation or a full paper summary?</em> This mode <strong>expands AI's access to larger sections of the paper</strong>, 
                  ensuring <strong>comprehensive answers</strong> to your queries. Ideal for summarizing complex papers 
                  <strong> without missing crucial details</strong>.
                </p>
                
                <div className="aboutpage-feature-image-single">
                  <img src={RetrievalQualityEnhancerModeImage} alt="Retrieval Quality Enhancer Mode" />
                </div>
                
                <p className="aboutpage-feature-note">Incurs additional token usage and +1 API request.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;