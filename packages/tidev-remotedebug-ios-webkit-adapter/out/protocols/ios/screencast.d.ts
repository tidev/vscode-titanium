import { Target } from '../target';
export declare class ScreencastSession {
    private _target;
    private _frameId;
    private _framesAcked;
    private _frameInterval;
    private _format;
    private _quality;
    private _maxWidth;
    private _maxHeight;
    private _timerCookie;
    private _deviceWidth;
    private _deviceHeight;
    private _offsetTop;
    private _pageScaleFactor;
    private _scrollOffsetX;
    private _scrollOffsetY;
    constructor(target: Target, format?: string, quality?: number, maxWidth?: number, maxHeight?: number);
    dispose(): void;
    start(): void;
    stop(): void;
    ackFrame(frameNumber: number): void;
    private recordingLoop;
}
