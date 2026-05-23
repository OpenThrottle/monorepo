import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAudio } from '../useAudio';

function AudioHarness(props: { readonly src?: string }) {
  const audio = useAudio({ src: props.src });

  return (
    <div>
      <audio data-testid="audio" ref={audio.audioRef} />
      <span data-testid="paused">{String(audio.paused)}</span>
      <span data-testid="current-time">{audio.currentTime}</span>
      <span data-testid="duration">{audio.duration}</span>
      <span data-testid="ended">{String(audio.ended)}</span>
      <span data-testid="error">{audio.error?.message ?? ''}</span>
      <button
        data-testid="play"
        onClick={() => void audio.play()}
        type="button"
      >
        Play
      </button>
      <button data-testid="pause" onClick={() => audio.pause()} type="button">
        Pause
      </button>
      <button
        data-testid="toggle"
        onClick={() => void audio.toggle()}
        type="button"
      >
        Toggle
      </button>
      <button data-testid="seek" onClick={() => audio.seek(12)} type="button">
        Seek
      </button>
    </div>
  );
}

describe('useAudio', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  test('starts paused before playback', () => {
    render(<AudioHarness />);

    expect(screen.getByTestId('paused')).toHaveTextContent('true');
    expect(screen.getByTestId('current-time')).toHaveTextContent('0');
  });

  describe('when play is invoked', () => {
    test('calls HTMLMediaElement.play and updates paused state', async () => {
      const user = userEvent.setup();
      render(<AudioHarness />);

      const audio = screen.getByTestId('audio') as HTMLAudioElement;
      Object.defineProperty(audio, 'paused', {
        configurable: true,
        get: () => false,
      });

      await user.click(screen.getByTestId('play'));

      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
      await act(async () => {
        audio.dispatchEvent(new Event('play'));
      });

      expect(screen.getByTestId('paused')).toHaveTextContent('false');
    });
  });

  describe('when pause is invoked', () => {
    test('updates paused state via pause event', async () => {
      const user = userEvent.setup();
      render(<AudioHarness />);

      const audio = screen.getByTestId('audio') as HTMLAudioElement;

      await user.click(screen.getByTestId('pause'));

      await act(async () => {
        audio.dispatchEvent(new Event('pause'));
      });

      expect(screen.getByTestId('paused')).toHaveTextContent('true');
    });
  });

  describe('when seek is invoked', () => {
    test('sets currentTime on the media element', async () => {
      const user = userEvent.setup();
      render(<AudioHarness />);

      const audio = screen.getByTestId('audio') as HTMLAudioElement;

      await user.click(screen.getByTestId('seek'));

      expect(audio.currentTime).toBe(12);

      await act(async () => {
        audio.dispatchEvent(new Event('timeupdate'));
      });

      expect(screen.getByTestId('current-time')).toHaveTextContent('12');
    });
  });

  describe('when toggle is invoked', () => {
    test('plays when paused', async () => {
      const user = userEvent.setup();
      render(<AudioHarness />);

      await user.click(screen.getByTestId('toggle'));

      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });
  });

  describe('when src is provided', () => {
    test('assigns src on the bound audio element', () => {
      render(<AudioHarness src="https://example.com/sound.mp3" />);

      const audio = screen.getByTestId('audio') as HTMLAudioElement;
      expect(audio.src).toContain('sound.mp3');
    });
  });
});
