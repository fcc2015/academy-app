import React from 'react';
import MedicalCard from '../../../components/MedicalCard';

const ParentMedicalSection = ({ child, isRTL }) => {
    return (
        <div className="animate-slide-up">
            <MedicalCard player={child} isRTL={isRTL} />
        </div>
    );
};

export default ParentMedicalSection;
