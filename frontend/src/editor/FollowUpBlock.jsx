import React from "react";
import './FollowUpBlock.css';
import PlusIcon from '../assets/images/plus.png';

const FollowUpBlock = ({ suggestions, onSelect }) => {
    // const tempSuggestions = [
    //     "What's the biggest impact of this idea in AI community?",
    //     "How many layer's of interpretation are we currently operating on?",
    //     "Did prior work directly inspire this?",
    //     "Who are the authors of this increadible paper and how many wrote this?"
    // ];

    return (
        <div className="followup-block">
            <div className="followup-title-container">
                <span>Follow Up Suggestions</span>
            </div>
            <div className="followup-content-container">
                {
                    suggestions.map((sugg, index) => {
                        return (
                            <div
                                key={index}
                                className={`followup-suggestion ${index === 0 ? 'top' : index === sugg.length - 1 ? 'bottom' : 'mid'}`}
                                onClick={() => onSelect(sugg)}
                            >
                                <span className="followup-suggestion-span">{sugg}</span>
                                <div className="followup-plus-icon-wrapper">
                                    <img className="followup-plus-icon-wrapper-img" src={PlusIcon} alt="plus icon" />
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    );
};

export default FollowUpBlock;