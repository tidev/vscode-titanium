import { ProtocolAdapter } from '../protocol';
import { Target } from '../target';
import { ScreencastSession } from './screencast';
export declare abstract class IOSProtocol extends ProtocolAdapter {
    static BEGIN_COMMENT: string;
    static END_COMMENT: string;
    static SEPARATOR: string;
    protected _styleMap: Map<string, any>;
    protected _isEvaluating: boolean;
    protected _lastScriptEval: string;
    protected _lastNodeId: number;
    protected _lastPageExecutionContextId: number;
    protected _screencastSession: ScreencastSession;
    constructor(target: Target);
    private onDomGetDocument;
    private onSetStyleTexts;
    private compareRanges;
    private onGetMatchedStylesForNode;
    private onCanEmulate;
    private onGetPlatformFontsForNode;
    private onGetBackgroundColors;
    private onAddRule;
    private onCanSetScriptSource;
    private onSetBlackboxPatterns;
    private onSetAsyncCallStackDepth;
    private onDebuggerEnable;
    private onGetMatchedStylesForNodeResult;
    private onExecutionContextCreated;
    private onEvaluate;
    private onRuntimeOnCompileScript;
    onRuntimeGetProperties(msg: any): Promise<any>;
    private onScriptParsed;
    private onDomEnable;
    private onSetInspectMode;
    private onInspect;
    private DOMDebuggerOnGetEventListeners;
    private onPushNodesByBackendIdsToFrontend;
    private onGetBoxModel;
    private onGetNodeForLocation;
    private onStartScreencast;
    private onStopScreencast;
    private onScreencastFrameAck;
    private onGetNavigationHistory;
    private onEmulateTouchFromMouseEvent;
    private onCanEmulateNetworkConditions;
    private onConsoleMessageAdded;
    protected enumerateStyleSheets(): void;
    protected mapSelectorList(selectorList: any): void;
    protected mapRule(cssRule: any): void;
    protected mapStyle(cssStyle: any, ruleOrigin: any): void;
    protected mapCssProperty(cssProperty: any): void;
    /**
     * Converts a given index to line and column, offset from a given range otherwise from 0.
     * @returns Line column converted from the given index and offset start range.
     */
    private static getLineColumnFromIndex;
    /**
     * Extract a sequence of texts with ranges corresponding to block comments in the CSS.
     * The texts may or may not contain CSS properties.
     * @returns An array of the disabled styles
     */
    private static extractDisabledStyles;
}
