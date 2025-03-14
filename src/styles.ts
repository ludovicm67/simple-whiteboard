import { css } from "lit";

export const styles = css`
  .root {
    height: 100%;
    width: 100%;
    background-color: #fcfcff;
    position: relative;
  }

  .button {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
  }
  .button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .width-100-percent {
    width: 100%;
  }

  .menu {
    position: absolute;
    z-index: 2;
    top: 16px;
    left: 16px;
    user-select: none;
  }

  .menu button:hover {
    background-color: #dfdfdf;
  }

  .tools {
    user-select: none;
    gap: 8px;
    padding: 3px;
    border-radius: 8px;
    background-color: #fff;
    margin: auto;
    position: absolute;
    z-index: 1;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
    white-space: nowrap;
    max-width: calc(100% - 128px);
    scrollbar-width: thin;
  }

  .tools button {
    background-color: transparent;
    color: #000;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .tools button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .tools button:active,
  .tools .tools--active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .tools-options {
    user-select: none;
    position: absolute;
    z-index: 1;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
    top: 84px;
    width: 200px;
    left: 16px;
    background-color: #fff;
    border-radius: 8px;
    padding: 8px 12px;
  }

  .footer-tools {
    position: absolute;
    z-index: 1;
    bottom: 0;
    left: 0;
    background-color: #f2f3f3;
    padding: 2px 8px;
    border-top-right-radius: 8px;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: rgba(0, 0, 0, 0.5);
  }

  .footer-tools select {
    color: rgba(0, 0, 0, 0.5);
    padding: 4px;
  }

  @media (max-width: 450px) {
    .tools-options {
      width: calc(100% - 64px);
    }
  }

  .tools-options p {
    font-size: 14px;
    margin: 0;
  }

  canvas {
    top: 0;
    left: 0;
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
`;
