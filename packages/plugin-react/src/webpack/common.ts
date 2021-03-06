import { resolve } from 'path';

import * as Chain from 'webpack-chain';
import { getEnv, error, exit } from '@alicloud/console-toolkit-shared-utils';
import { PluginAPI } from '@alicloud/console-toolkit-core';

import { file, jsx, style } from './rules';
import { htmlPlugin } from './plugins/html';
import { progressPlugin } from './plugins/progress';
import { skeletonPlugin } from './plugins/skeleton';
import { htmlInjectPlugin } from './plugins/htmlInject';
import { BreezrReactOptions, CssConditionType } from '../types';

const defaultOptions = {
  cwd: process.cwd(),
  // 入口文件
  entry: './index.js',
  output: {
    filename: '[name].js',
    // 输出的打包文件
    path: 'build',
    // 项目输出路径
    publicPath: '/',
    // 对于热替换(HMR)是必须的，让 webpack 知道在哪里载入热更新的模块(chunk)
    chunkFilename: '[name].js',
  },

  disableBabelLoaderCache: true,
  disableReactHotLoader: false,
  htmlXmlMode: false,
  disableExtractText: false,
  useLegacyCssModules: false,
  babelPluginWindCherryPick: true,

  bail: false,
  status: {
    children: false
  },
};

const isRelativePath = (path: string) => /^[.a-zA-Z0-9]/i.test(path);

export const common = (config: Chain, options: BreezrReactOptions = defaultOptions, api: PluginAPI) => {
  const {
    cwd,
    entry = './index.js',
    output: userOutput,
    bail,
    status,
    disableReactHotLoader,
    babelExclude,
    babelPluginWindRc,
    babelPluginWindIntl,
    disableExtractText,
    noProgress,
    disableHtml,
    disablePolyfill,
    experiment,
    htmlFileName,
    useLegacyCssModules,
    condition: cssCondition,
    theme,
    classNamePrefix,
    babelPluginWindCherryPick,
    babel,
    htmlXmlMode
  } = options;

  if (!cwd) {
    error('can\'t not get cwd for webpack');
    exit(1);
    return;
  }

  const src = resolve(cwd, 'src');
  // output
  const output = {
    ...defaultOptions.output,
    ...userOutput
  };
  const outputPath = isRelativePath(output.path) ? resolve(cwd, output.path) : output.path;

  // entry
  config
    .context(src)
    .entry('index')
    .add(entry)
    .end()
    .output
    .filename(output.filename)
    .path(outputPath)
    .publicPath(output.publicPath)
    .chunkFilename(output.chunkFilename)
    .end();

  if (!disablePolyfill) {
    config
      .entry('index')
      .add(require.resolve('babel-polyfill'));
  }

  config.resolve
    .extensions
    .merge(['.js', '.jsx']);
  
  // rules
  jsx(config, {
    babel,
    reactHotLoader: !disableReactHotLoader,
    reactCssModules: true,
    reactCssModulesContext: src,
    // reactCssModulesResolvePath: nodeModules,
    exclude: babelExclude,
    windRc: babelPluginWindRc,
    windIntl: babelPluginWindIntl,
    windCherryPick: babelPluginWindCherryPick
  });

  let condition: CssConditionType = 'stable';
  if (useLegacyCssModules) {
    condition = 'legacy';
  } else if (cssCondition) {
    condition = cssCondition;
  }
  style(config, {
    cwd,
    shouldExtract: !disableExtractText,
    condition,
    theme,
    classNamePrefix
  });

  file(config, options);

  // plugins
  if (!disableHtml) {
    const htmlData = api.dispatchSync('getHtmlData');

    htmlPlugin(config, {
      template: htmlFileName ? htmlFileName : resolve(cwd, 'src/index.html'),
      templateParameters: {
        __dev__: getEnv().isDev(),
      },
    });
    htmlInjectPlugin(config, {
      data: htmlData,
      htmlXmlMode,
    });
  }

  if (!disableHtml && experiment && experiment.skeleton) {
    skeletonPlugin(config, experiment.skeleton);
  }

  if (!noProgress) {
    progressPlugin(config);
  }

  // others
  if (status) {
    config.stats(status);
  }
  
  if (bail) {
    config.bail(bail);
  }
};