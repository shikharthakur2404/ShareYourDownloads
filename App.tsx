import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  requestDownload,
  type DownloadFormat,
} from './src/services/downloadService';
import {
  getYouTubeUrlError,
  isValidYouTubeUrl,
} from './src/utils/youtubeValidation';

type DownloadPhase = 'idle' | 'running' | 'done' | 'error';

const App = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<DownloadFormat>('video');
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    'Paste a YouTube URL to begin.',
  );

  const urlError = useMemo(() => getYouTubeUrlError(url), [url]);

  const isBusy = phase === 'running';

  const onPaste = async () => {
    const clipboardText = await Clipboard.getString();
    setUrl(clipboardText.trim());
    setStatusMessage('URL pasted from clipboard.');
    setPhase('idle');
  };

  const onDownload = async () => {
    if (!isValidYouTubeUrl(url)) {
      setPhase('error');
      setStatusMessage(
        getYouTubeUrlError(url) ??
          'Please enter a valid YouTube URL before downloading.',
      );
      return;
    }

    setPhase('running');
    setProgress(0);
    setStatusMessage(`Starting ${format} download request...`);

    const response = await requestDownload({
      url,
      format,
      onProgress: nextProgress => setProgress(nextProgress),
    });

    if (response.ok) {
      setProgress(100);
      setPhase('done');
      setStatusMessage(
        response.fileUrl
          ? `Download ready (${response.requestId}).`
          : `Download started (${response.requestId}).`,
      );
      return;
    }

    setProgress(0);
    setPhase('error');
    if (response.isStub) {
      setStatusMessage(`Stub mode (backend offline): ${response.message}`);
      return;
    }

    setStatusMessage(`Download failed: ${response.message}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Share Your Downloads</Text>
        <Text style={styles.subtitle}>
          Paste a YouTube link and pick Video or Audio.
        </Text>

        <View style={styles.row}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://youtube.com/watch?v=..."
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isBusy}
            style={[styles.input, phase === 'error' ? styles.inputError : null]}
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={onPaste}
            disabled={isBusy}>
            <Text style={styles.secondaryButtonText}>Paste</Text>
          </Pressable>
        </View>

        {url.length > 0 && urlError ? (
          <Text style={styles.errorText}>{urlError}</Text>
        ) : null}

        <View style={styles.toggleContainer}>
          {(['video', 'audio'] as DownloadFormat[]).map(option => {
            const selected = format === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.toggleButton,
                  selected ? styles.toggleButtonActive : null,
                ]}
                onPress={() => setFormat(option)}
                disabled={isBusy}>
                <Text
                  style={[
                    styles.toggleText,
                    selected ? styles.toggleTextActive : null,
                  ]}>
                  {option === 'video' ? 'Video' : 'Audio'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            isBusy ? styles.primaryButtonDisabled : null,
          ]}
          onPress={onDownload}
          disabled={isBusy}>
          <Text style={styles.primaryButtonText}>
            {isBusy ? 'Starting...' : 'Download'}
          </Text>
        </Pressable>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Status</Text>
            {isBusy ? <ActivityIndicator size="small" /> : null}
          </View>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
          <Text style={styles.progressLabel}>Progress: {progress}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#c8d0f2',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#344067',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ff5b6b',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#4e5e8f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff8e97',
    fontSize: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#344067',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2f64ff',
    borderColor: '#2f64ff',
  },
  toggleText: {
    color: '#dbe2ff',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#00b894',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#062d25',
    fontWeight: '700',
  },
  statusCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a3355',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    backgroundColor: '#131a31',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusMessage: {
    color: '#dbe2ff',
    fontSize: 13,
  },
  progressLabel: {
    color: '#b5bfeb',
    fontSize: 12,
  },
});

export default App;
