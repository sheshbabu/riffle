import Button from '../../commons/components/Button.jsx';
import ApiClient from '../../commons/http/ApiClient.js';
import formatCount from '../../commons/utils/formatCount.js';
import FormSection from '../../commons/components/FormSection.jsx';

const { useState, useEffect, useRef } = React;

export default function ThumbnailRebuildSection() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    async function checkOngoingRebuild() {
      try {
        const progressData = await ApiClient.getThumbnailRebuildProgress();
        if (progressData.status === 'processing') {
          setIsProcessing(true);
          setProgress(progressData);
          startPollingProgress();
        }
      } catch (error) {
        console.error('Failed to check thumbnail rebuild status', error);
      }
    }

    checkOngoingRebuild();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  async function handleRebuildClick() {
    setIsProcessing(true);
    setProgress({ status: 'processing', percent: 0 });

    try {
      await ApiClient.rebuildThumbnails();
      startPollingProgress();
    } catch (error) {
      console.error('Failed to start thumbnail rebuild', error);
      setIsProcessing(false);
      setProgress(null);
    }
  }

  function startPollingProgress() {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const progressData = await ApiClient.getThumbnailRebuildProgress();
        setProgress(progressData);

        if (progressData.status === 'complete') {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setIsProcessing(false);
          setTimeout(() => {
            setProgress(null);
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to fetch thumbnail progress', error);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsProcessing(false);
        setProgress(null);
      }
    }, 500);
  }

  const buttonText = isProcessing ? 'Rebuilding...' : 'Rebuild Thumbnails';

  let progressText = null;

  if (progress) {
    if (progress.status === 'processing') {
      const completedText = formatCount(progress.completed, 0);
      const totalText = formatCount(progress.total, 0);
      const percent = progress.percent || 0;
      progressText = `Processing ${completedText} / ${totalText} (${percent}%)`;
    }

    if (progress.status === 'complete') {
      const totalText = formatCount(progress.total, 0);
      progressText = `Successfully rebuilt ${totalText} thumbnails`;
    }
  }

  let progressElement = null;
  if (progressText) {
    progressElement = <div className="progress-text">{progressText}</div>;
  }

  return (
    <FormSection
      title="Thumbnail Cache"
      description="Rebuild all 300×300 preview thumbnails. Useful after updating images or if thumbnails appear corrupted."
    >
      <Button onClick={handleRebuildClick} isLoading={isProcessing}>
        {buttonText}
      </Button>
      {progressElement}
    </FormSection>
  );
}
