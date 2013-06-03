// Generated by Caffeine 0.2.7
(function() {
  var BANNER, Caffeine, EventEmitter, Import, SWITCHES, compileJoin, compileOptions, compilePath, compileScript, compileStdio, exec, exists, forkNode, fs, helpers, hidden, joinTimeout, lint, loadRequires, minifyCode, notSources, optionParser, optparse, opts, outputPath, parseOptions, path, printLine, printTokens, printWarn, removeSource, sourceCode, sources, spawn, timeLog, unwatchDir, usage, version, wait, watch, watchDir, writeJs, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  path = require('path');

  helpers = require('./helpers');

  optparse = require('./optparse');

  Caffeine = require('./caffeine');

  Import = require('./nodes').Import;

  _ref = require('child_process'), spawn = _ref.spawn, exec = _ref.exec;

  EventEmitter = require('events').EventEmitter;

  exists = fs.exists || path.exists;

  helpers.extend(Caffeine, new EventEmitter);

  printLine = function(line) {
    return process.stdout.write(line + '\n');
  };

  printWarn = function(line) {
    return process.stderr.write(line + '\n');
  };

  hidden = function(file) {
    return /^\.|~$/.test(file);
  };

  BANNER = 'Usage: caffeine [options] path/to/script.coffee -- [args]\n\nIf called without options, `caffeine` will run your script.';

  SWITCHES = [['-b', '--bare', 'compile without a top-level function wrapper'], ['-c', '--compile', 'compile to JavaScript and save as .js files'], ['-e', '--eval', 'pass a string from the command line as input'], ['-h', '--help', 'display this help message'], ['-i', '--interactive', 'run an interactive Caffeine REPL'], ['-j', '--join [FILE]', 'concatenate the source CoffeeScript before compiling'], ['-l', '--lint', 'pipe the compiled JavaScript through JavaScript Lint'], ['-n', '--nodes', 'print out the parse tree that the parser produces'], ['--nodejs [ARGS]', 'pass options directly to the "node" binary'], ['-o', '--output [DIR]', 'set the output directory for compiled JavaScript'], ['-p', '--print', 'print out the compiled JavaScript'], ['-r', '--require [FILE*]', 'require a library before executing your script'], ['-s', '--stdio', 'listen for and compile scripts over stdio'], ['-t', '--tokens', 'print out the tokens that the lexer/rewriter produce'], ['-v', '--version', 'display the version number'], ['-w', '--watch', 'watch scripts for changes and rerun commands'], ['-z', '--minify', 'minify with UglifyJS']];

  opts = {};

  sources = [];

  sourceCode = [];

  notSources = {};

  optionParser = null;

  exports.run = function() {
    var literals, source, _i, _len, _results;
    parseOptions();
    if (opts.nodejs) {
      return forkNode();
    }
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    if (opts.require) {
      loadRequires();
    }
    if (opts.interactive) {
      return require('./repl');
    }
    if (opts.watch && !(fs.watchFile || fs.watch)) {
      return printWarn("The --watch feature depends on Node v0.6.0+. You are running " + process.version + ".");
    }
    if (opts.stdio) {
      return compileStdio();
    }
    if (opts["eval"]) {
      return compileScript(null, sources[0]);
    }
    if (!sources.length) {
      return require('./repl');
    }
    literals = opts.run ? sources.splice(1) : [];
    process.argv = process.argv.slice(0, 2).concat(literals);
    process.argv[0] = 'caffeine';
    process.execPath = require.main.filename;
    _results = [];
    for (_i = 0, _len = sources.length; _i < _len; _i++) {
      source = sources[_i];
      _results.push(compilePath(source, true, path.normalize(source)));
    }
    return _results;
  };

  compilePath = function(source, topLevel, base) {
    return fs.stat(source, function(err, stats) {
      if (err && err.code !== 'ENOENT') {
        throw err;
      }
      if ((err != null ? err.code : void 0) === 'ENOENT') {
        if (topLevel && source.slice(-7) !== '.coffee') {
          source = sources[sources.indexOf(source)] = "" + source + ".coffee";
          return compilePath(source, topLevel, base);
        }
        if (topLevel) {
          console.error("File not found: " + source);
          process.exit(1);
        }
        return;
      }
      if (stats.isDirectory()) {
        if (opts.watch) {
          watchDir(source, base);
        }
        return fs.readdir(source, function(err, files) {
          var file, index, _ref1, _ref2;
          if (err && err.code !== 'ENOENT') {
            throw err;
          }
          if ((err != null ? err.code : void 0) === 'ENOENT') {
            return;
          }
          index = sources.indexOf(source);
          files = files.filter(function(file) {
            return !hidden(file);
          });
          [].splice.apply(sources, [index, index - index + 1].concat(_ref1 = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = files.length; _i < _len; _i++) {
              file = files[_i];
              _results.push(path.join(source, file));
            }
            return _results;
          })())), _ref1;
          [].splice.apply(sourceCode, [index, index - index + 1].concat(_ref2 = files.map(function() {
            return null;
          }))), _ref2;
          return files.forEach(function(file) {
            return compilePath(path.join(source, file), false, base);
          });
        });
      } else if (topLevel || path.extname(source) === '.coffee') {
        if (opts.watch) {
          watch(source, base);
        }
        return fs.readFile(source, function(err, code) {
          if (err && err.code !== 'ENOENT') {
            throw err;
          }
          if ((err != null ? err.code : void 0) === 'ENOENT') {
            return;
          }
          return compileScript(source, code.toString(), base);
        });
      } else {
        notSources[source] = true;
        return removeSource(source, base);
      }
    });
  };

  compileScript = function(file, input, base) {
    var o, options, output, t, task, time;
    o = opts;
    options = compileOptions(file);
    try {
      t = task = {
        file: file,
        input: input,
        options: options
      };
      Caffeine.emit('compile', task);
      if (o.tokens) {
        return printTokens(Caffeine.tokens(t.input));
      } else if (o.nodes) {
        return printLine(Caffeine.nodes(t.input).toString().trim());
      } else if (o.run) {
        return Caffeine.run(t.input, t.options);
      } else if (o.join && t.file !== o.join) {
        sourceCode[sources.indexOf(t.file)] = t.input;
        output = compileJoin();
        if (o.minify) {
          output = minifyCode(output);
        }
        return output;
      } else {
        time = new Date();
        t.output = Caffeine.compile(t.input, t.options);
        if (o.minify) {
          t.output = minifyCode(t.output);
        }
        Caffeine.emit('success', task);
        if (o.print) {
          return printLine(t.output.trim());
        } else if (o.compile) {
          return writeJs(t.file, t.output, base, new Date() - time);
        } else if (o.lint) {
          return lint(t.file, t.output);
        }
      }
    } catch (err) {
      Caffeine.emit('failure', err, task);
      if (Caffeine.listeners('failure').length) {
        return;
      }
      if (o.watch) {
        return printLine(err.message + '\x07');
      }
      printWarn(err instanceof Error && err.stack || ("ERROR: " + err));
      return process.exit(1);
    }
  };

  minifyCode = function(code) {
    var parser, uglify, _ref1;
    _ref1 = require('uglify-js'), parser = _ref1.parser, uglify = _ref1.uglify;
    return uglify.gen_code(uglify.ast_squeeze(uglify.ast_mangle(parser.parse(code))));
  };

  compileStdio = function() {
    var code, stdin;
    code = '';
    stdin = process.openStdin();
    stdin.on('data', function(buffer) {
      if (buffer) {
        return code += buffer.toString();
      }
    });
    return stdin.on('end', function() {
      return compileScript(null, code);
    });
  };

  joinTimeout = null;

  compileJoin = function() {
    if (!opts.join) {
      return;
    }
    if (!sourceCode.some(function(code) {
      return code === null;
    })) {
      clearTimeout(joinTimeout);
      return joinTimeout = wait(100, function() {
        return compileScript(opts.join, sourceCode.join('\n'), opts.join);
      });
    }
  };

  loadRequires = function() {
    var realFilename, req, _i, _len, _ref1;
    realFilename = module.filename;
    module.filename = '.';
    _ref1 = opts.require;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      req = _ref1[_i];
      require(req);
    }
    return module.filename = realFilename;
  };

  watch = function(source, base) {
    var allStats, compile, compileTimeout, deepWatch, rewatch, watchErr, watchers;
    watchers = {};
    allStats = {};
    compileTimeout = null;
    watchErr = function(e) {
      if (e.code === 'ENOENT') {
        if (sources.indexOf(source) === -1) {
          return;
        }
        try {
          rewatch();
          return compile(source);
        } catch (e) {
          removeSource(source, base, true);
          return compileJoin();
        }
      } else {
        throw e;
      }
    };
    compile = function(filename) {
      clearTimeout(compileTimeout);
      return compileTimeout = wait(25, function() {
        var prevStats;
        prevStats = allStats[filename];
        return fs.stat(filename, function(err, stats) {
          if (err) {
            return watchErr(err);
          }
          if (prevStats && stats.size === prevStats.size && stats.mtime.getTime() === prevStats.mtime.getTime()) {
            return rewatch();
          }
          allStats[filename] = stats;
          return fs.readFile(source, function(err, code) {
            if (err) {
              return watchErr(err);
            }
            compileScript(source, code.toString(), base);
            return rewatch();
          });
        });
      });
    };
    rewatch = function() {
      var filename, watchList, watcher;
      for (filename in watchers) {
        watcher = watchers[filename];
        if (typeof fs.unwatchFile === "function") {
          fs.unwatchFile(filename);
        }
        if (typeof watcher.close === "function") {
          watcher.close();
        }
      }
      watchers = {};
      allStats = {};
      watchList = [];
      return deepWatch(source, watchList, function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = watchList.length; _i < _len; _i++) {
          filename = watchList[_i];
          if (!(filename in watchers)) {
            _results.push((function(filename) {
              return watchers[filename] = (function() {
                try {
                  return fs.watchFile(filename, function() {
                    return compile(filename);
                  });
                } catch (ex) {
                  return fs.watch(filename, function() {
                    return compile(filename);
                  });
                }
              })();
            })(filename));
          }
        }
        return _results;
      });
    };
    deepWatch = function(filename, watchList, callback) {
      if (__indexOf.call(watchList, filename) >= 0) {
        return false;
      }
      watchList.push(filename);
      process.nextTick(function() {
        return fs.stat(filename, function(err, stats) {
          if (err) {
            return watchErr(err);
          }
          allStats[filename] = stats;
          return process.nextTick(function() {
            return fs.readFile(filename, function(err, code) {
              var expr, filepath, importExists, nodes, _i, _len, _ref1;
              if (err && err.code !== 'ENOENT') {
                return watchErr(err);
              }
              if ((err != null ? err.code : void 0) === 'ENOENT') {
                return callback();
              }
              importExists = false;
              try {
                nodes = Caffeine.nodes(code.toString());
              } catch (ex) {

              }
              _ref1 = (nodes != null ? nodes.expressions : void 0) || [];
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                expr = _ref1[_i];
                if (!(expr instanceof Import)) {
                  continue;
                }
                try {
                  filepath = expr.filename({
                    filename: filename
                  });
                } catch (ex) {

                }
                if (filepath && deepWatch(filepath, watchList, callback)) {
                  importExists = true;
                }
              }
              if (!importExists) {
                return callback();
              }
            });
          });
        });
      });
      return true;
    };
    try {
      return rewatch();
    } catch (e) {
      return watchErr(e);
    }
  };

  watchDir = function(source, base) {
    var readdirTimeout, watcher;
    readdirTimeout = null;
    try {
      return watcher = fs.watch(source, function() {
        clearTimeout(readdirTimeout);
        return readdirTimeout = wait(25, function() {
          return fs.readdir(source, function(err, files) {
            var file, _i, _len, _results;
            if (err) {
              if (err.code !== 'ENOENT') {
                throw err;
              }
              watcher.close();
              return unwatchDir(source, base);
            }
            _results = [];
            for (_i = 0, _len = files.length; _i < _len; _i++) {
              file = files[_i];
              if (!(!hidden(file) && !notSources[file])) {
                continue;
              }
              file = path.join(source, file);
              if (sources.some(function(s) {
                return s.indexOf(file) >= 0;
              })) {
                continue;
              }
              sources.push(file);
              sourceCode.push(null);
              _results.push(compilePath(file, false, base));
            }
            return _results;
          });
        });
      });
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  };

  unwatchDir = function(source, base) {
    var file, prevSources, toRemove, _i, _len;
    prevSources = sources.slice(0);
    toRemove = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = sources.length; _i < _len; _i++) {
        file = sources[_i];
        if (file.indexOf(source) >= 0) {
          _results.push(file);
        }
      }
      return _results;
    })();
    for (_i = 0, _len = toRemove.length; _i < _len; _i++) {
      file = toRemove[_i];
      removeSource(file, base, true);
    }
    if (!sources.some(function(s, i) {
      return prevSources[i] !== s;
    })) {
      return;
    }
    return compileJoin();
  };

  removeSource = function(source, base, removeJs) {
    var index, jsPath;
    index = sources.indexOf(source);
    sources.splice(index, 1);
    sourceCode.splice(index, 1);
    if (removeJs && !opts.join) {
      jsPath = outputPath(source, base);
      return exists(jsPath, function(itExists) {
        if (itExists) {
          return fs.unlink(jsPath, function(err) {
            if (err && err.code !== 'ENOENT') {
              throw err;
            }
            return timeLog("removed " + source);
          });
        }
      });
    }
  };

  outputPath = function(source, base) {
    var baseDir, dir, filename, srcDir;
    filename = path.basename(source, path.extname(source)) + '.js';
    srcDir = path.dirname(source);
    baseDir = base === '.' ? srcDir : srcDir.substring(base.length);
    dir = opts.output ? path.join(opts.output, baseDir) : srcDir;
    return path.join(dir, filename);
  };

  writeJs = function(source, js, base, time) {
    var compile, jsDir, jsPath;
    jsPath = outputPath(source, base);
    jsDir = path.dirname(jsPath);
    compile = function() {
      if (js.length <= 0) {
        js = ' ';
      }
      return fs.writeFile(jsPath, js, function(err) {
        if (err) {
          return printLine(err.message);
        } else if (opts.compile && opts.watch) {
          return timeLog("compiled " + source + " " + time + "ms");
        }
      });
    };
    return exists(jsDir, function(itExists) {
      if (itExists) {
        return compile();
      } else {
        return exec("mkdir -p " + jsDir, compile);
      }
    });
  };

  wait = function(milliseconds, func) {
    return setTimeout(func, milliseconds);
  };

  timeLog = function(message) {
    return console.log("" + ((new Date).toLocaleTimeString()) + " - " + message);
  };

  lint = function(file, js) {
    var conf, jsl, printIt;
    printIt = function(buffer) {
      return printLine(file + ':\t' + buffer.toString().trim());
    };
    conf = __dirname + '/../../extras/jsl.conf';
    jsl = spawn('jsl', ['-nologo', '-stdin', '-conf', conf]);
    jsl.stdout.on('data', printIt);
    jsl.stderr.on('data', printIt);
    jsl.stdin.write(js);
    return jsl.stdin.end();
  };

  printTokens = function(tokens) {
    var strings, tag, token, value;
    strings = (function() {
      var _i, _len, _ref1, _results;
      _results = [];
      for (_i = 0, _len = tokens.length; _i < _len; _i++) {
        token = tokens[_i];
        _ref1 = [token[0], token[1].toString().replace(/\n/, '\\n')], tag = _ref1[0], value = _ref1[1];
        _results.push("[" + tag + " " + value + "]");
      }
      return _results;
    })();
    return printLine(strings.join(' '));
  };

  parseOptions = function() {
    var i, o, source, _i, _len;
    optionParser = new optparse.OptionParser(SWITCHES, BANNER);
    o = opts = optionParser.parse(process.argv.slice(2));
    o.compile || (o.compile = !!o.output);
    o.run = !(o.compile || o.print || o.lint);
    o.print = !!(o.print || (o["eval"] || o.stdio && o.compile));
    sources = o["arguments"];
    for (i = _i = 0, _len = sources.length; _i < _len; i = ++_i) {
      source = sources[i];
      sourceCode[i] = null;
    }
  };

  compileOptions = function(filename) {
    return {
      filename: filename,
      bare: opts.bare,
      header: opts.compile
    };
  };

  forkNode = function() {
    var args, nodeArgs;
    nodeArgs = opts.nodejs.split(/\s+/);
    args = process.argv.slice(1);
    args.splice(args.indexOf('--nodejs'), 2);
    return spawn(process.execPath, nodeArgs.concat(args), {
      cwd: process.cwd(),
      env: process.env,
      customFds: [0, 1, 2]
    });
  };

  usage = function() {
    return printLine((new optparse.OptionParser(SWITCHES, BANNER)).help());
  };

  version = function() {
    return printLine("Caffeine version " + Caffeine.VERSION);
  };

}).call(this);