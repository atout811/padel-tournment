import { useEffect, useReducer } from 'react';

export function getRecommendedFormat(participantCount) {
  return Number(participantCount || 0) >= 8 ? 'cup' : 'league';
}

const initialState = {
  currentStep: 'participants',
  format: 'league',
  formatTouched: false,
  courtCount: 1,
  scoringPreset: 'standard',
  maxSets: 3,
  deuceMode: 'advantage',
  showAdvanced: false,
};

function reducer(state, action) {
  if (action.type === 'setStep') {
    return { ...state, currentStep: action.step };
  }
  if (action.type === 'autoFormat') {
    if (state.formatTouched || state.format === action.format) return state;
    return { ...state, format: action.format };
  }
  if (action.type === 'setFormat') {
    return { ...state, format: action.format, formatTouched: true };
  }
  if (action.type === 'setCourtCount') {
    return { ...state, courtCount: action.courtCount };
  }
  if (action.type === 'setScoringPreset') {
    return {
      ...state,
      scoringPreset: action.preset,
      maxSets: action.preset === 'fast' ? 1 : 3,
      deuceMode: action.preset === 'fast' ? 'golden' : 'advantage',
    };
  }
  if (action.type === 'setMaxSets') {
    return { ...state, maxSets: action.maxSets, scoringPreset: 'custom' };
  }
  if (action.type === 'setDeuceMode') {
    return { ...state, deuceMode: action.deuceMode, scoringPreset: 'custom' };
  }
  if (action.type === 'toggleAdvanced') {
    return { ...state, showAdvanced: !state.showAdvanced };
  }
  return state;
}

export function useNightSetupFlow({ participantCount = 0, initialFormat } = {}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    format: initialFormat || getRecommendedFormat(participantCount),
  });

  useEffect(() => {
    dispatch({ type: 'autoFormat', format: getRecommendedFormat(participantCount) });
  }, [participantCount]);

  return {
    ...state,
    setStep: (step) => dispatch({ type: 'setStep', step }),
    setFormat: (format) => dispatch({ type: 'setFormat', format }),
    setCourtCount: (courtCount) => dispatch({ type: 'setCourtCount', courtCount }),
    applyPreset: (preset) => dispatch({ type: 'setScoringPreset', preset }),
    setMaxSets: (maxSets) => dispatch({ type: 'setMaxSets', maxSets }),
    setDeuceMode: (deuceMode) => dispatch({ type: 'setDeuceMode', deuceMode }),
    toggleAdvanced: () => dispatch({ type: 'toggleAdvanced' }),
  };
}
