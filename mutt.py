# Welcome to Mutt! -- Mozmill UniT Test --
# It's a harness to run tests against the Mozmill unit tests.  Well, it's something 
# of a mutt.
import optparse
import os
import sys
import re
import subprocess
import time
import pdb


def debug(aMsg):
  print('DBG::' + str(aMsg))

class ManifestParser:
  def __init__(self, results):
    self.log = results

  def parse(self, mani):
    if (not os.path.exists(mani)):
      self.log.write("Manifest does not exist: " + str(mani) + "\n")
      return None

    testlist = {'python': [],
                'mozmill': [],
                'restart': []}
    # TODO: Mozmill isn't handling absolute paths fix mozmill
    # manipath = os.path.split(os.path.abspath(mani))[0]
    manipath = os.path.split(mani)[0]
    comment = re.compile("^#.*")
    pytest = re.compile("(^python) (.*)")
    mztest = re.compile("(^mozmill) (.*)")
    retest = re.compile("(^restart) (.*)")
    stage1 = re.compile("(\S+)(.*)")
    
    f = open(mani, "r")

    for line in f:
      loc = ''
      options = []
      restrictions = []

      if (comment.match(line)):
        continue

      testtype, therest = self.getMatch([pytest, mztest, retest], line)  
      if (testtype == None):
        self.log.write("Cannot parse manifest " + str(mani) + " at line: " 
                       + str(line) + "\n")
        continue
      
      # Pull out the test locator
      m = stage1.match(therest)
      if (m):
        loc = os.path.join(manipath, m.group(1))
        if (m.group(2) != ''):
          try:
            firstb = m.group(2).index('{', 0)
            secondb = m.group(2).index('}', firstb)
            options = m.group(2)[firstb:secondb].split(',')
            
            # Now restrictions - these may not exist, so use find as it won't throw
            firstb = m.group(2).find('{', secondb)
            if (firstb != -1):
              secondb = m.group(2).find('}', firstb)
              restrictins = group(2)[firstb:secondb].split(',')
              
          except:
            self.log.write("Cannot parse option on " + str(mani) + " at line: "
                           + str(line) + "\n")

      else:
        self.log.write("Cannot parse manifest line " + str(mani) + " at line: "
                       + str(line) + "\n")
      
      # Now we have parsed the line
      testlist[testtype].append([loc, options, restrictions])
    
    return testlist

  def getMatch(self, regexes, line):
    for r in regexes:
      m = r.match(line)
      if m:
        return (m.group(1),m.group(2))
    return None, None


class Walker:

  def __init__(self):
    pass
  
  def getManifestList(self, manifest=None, parentdir=None):
    manifestList = []
    if manifest:
      manifestList.append(manifest)
    elif parentdir:
      manifestList = self.walkDir(parentdir)
    else:
      manifestList = self.walkDir()
    return manifestList

  def walkDir(self, seed=None):
    pass

class ResultCollector:
  def __init__(self, logfile):
    if (logfile):
      self.logfile = open(logfile, "w")
    else:
      self.logfile = None

  def write(self, aMsg):
    if (self.logfile):
      self.logfile.write(str(aMsg))
    else:
      print str(aMsg)

  def parseResults(self, resultsfile, didhang):
    # TODO: Do something better with this to tally the results
    f = open(resultsfile, "r")
    for line in f:
      self.write(line)
    if (didhang):
      self.write("FAIL Mozmill Hung\n")
    

  def summarizeResults(self):
    self.write("SUMMARY GOES HERE\n")

  def shutdown(self):
    if (self.logfile):
      self.logfile.close()
    else:
      pass

class MuttOptions(optparse.OptionParser):
  def __init__(self, **kwargs):
    optparse.OptionParser.__init__(self, **kwargs)
    defaults = {}
    self.add_option("--logfile",
                    action="store",
                    type="string",
                    dest="logfile",
                    help="File to write results to")
    defaults["logfile"] = None

    self.add_option("--xre-path",
                    action="store",
                    type="string",
                    dest="xrepath",
                    help="Path to binary version of XUL application to run tests with")
    defaults["xrepath"] = None

    self.add_option("--manifest",
                    action="store",
                    type="string",
                    dest="manifest",
                    help="Specific manifest to run.  If not specified will walk dirs to find manifests")
    defaults["manifest"] = None

    self.add_option("--debug",
                    action="store_true",
                    dest = "debug",
                    help = "Turn on debug mode to output debugging statements")
    defaults["debug"]  = False

    self.add_option("--test-type",
                    action="store",
                    dest="testtype",
                    help="Run a specific type of tests - options are: mozmill, restart, python, None means run them all")
    defaults["testtype"] = None

    self.add_option("--parent-dir",
                    action="store",
                    dest="parentdir",
                    help="Restricts the directory walker to a specific parent directory. The directory must include a child named 'test'")
    defaults["parentdir"] = None
    
    self.set_defaults(**defaults)
    usage = """\
Welcome to MUTT, Mozmill UniT Tester.  All arguments are optional.  Run some tests.  Have fun.  Envision world peace and bug free software."""

  def verifyOptions(self, options):
    if (options.xrepath and not os.path.exists(options.xrepath)):
        print "Cannot find your specified binary at: " + str(options.xrepath)
        return None
   
    if (options.manifest and not os.path.exists(options.manifest)):
      print "Cannot find specified manifest: " + str(options.manifest)
      return None

    if (options.parentdir and not os.path.exists(options.parentdir)):
      print "Cannot find specified parent directory: " + str(options.parentdir)
      return None

    if (options.testtype and (options.testtype not in ['mozmill', 'restart', 'python'])):
      print "Unrecognized testtype: " + str(options.testtype)
      return None
    
    if (options.manifest and options.parentdir):
      print "You cannot specify a manifest and a parent directory, please try again"
      return None

    return options

class TestRunner():
  def __init__(self, results, options):
    self.log = results
    self.xrepath = options.xrepath

    # Write our info to the results
    if (options.manifest):
      self.log.write("Starting test with manifest: " + str(options.manifest) + "\n")
    elif(options.parentdir):
      self.log.write("Starting test with parent dir: " + str(options.parentdir) + "\n")
    else:
      self.log.write("Starting full test!\n")
      
    # Walker returns us a list of manifests
    self.manifests = Walker().getManifestList(options.manifest, options.parentdir)
    
    # Cache our manifest parser
    self.maniParser = ManifestParser(results)

  def run(self):
    #pdb.set_trace()
    for mani in self.manifests:
      tests = self.maniParser.parse(mani)
      # tests are a dict of {<testtype>: [testlist]}
      if 'python' in tests:
        self.runPythonTests(tests['python'])
      if 'mozmill' in tests:
        self.runMozmillTests(tests['mozmill'])
      if 'restart' in tests:
        self.runRestartTests(tests['restart'])
  
    self.log.write("Test Run Finished:\n")
    self.log.summarizeResults()

  def runPythonTests(self, testlist):
    self.log.write("Running Python Tests\n")
    pass
  
  # restartcmd is used to pass in the restart command - either --restart for 2.0 or
  # restart for < 2.0.  This way we can do the right thing.
  def runMozmillTests(self, testlist, restartcmd = None):
    self.log.write("Running Mozmill Tests\n")
    
    for test in testlist:
      # Handle restart issue
      if (restartcmd == "restart"):
        args = ['mozmill-restart']
      else:
        args = ['mozmill']

      if (restartcmd == "--restart"):
        args.append(restartcmd)

      # Handle optional binary path
      if (self.xrepath):
        args.append('-b ' + self.xrepath)

      # Handle test path
      args.append('--test=' + test[0])

      # Set up our logging options
      args.append('--showall')
      args.append('--logfile=templog.log')
      p = subprocess.Popen(args)
      didhang = self.checkForHang(p)
    
      self.log.parseResults('templog.log', didhang)

  def runRestartTests(self, testlist):
    self.log.write("Running Restart Tests\n")
    # TODO: Steps are:
    # Verify mozmill version
    # Call mozmillTests above with restartcmd
    # If more options are needed then change restartcmd to a list
    # And change mozmillTests to deal with that.
    pass

  def checkForHang(self, proc):
    # Timeout Mozmill in 5 minutes
    timeout = 300
    beginning = time.time()
    secs = 0
    # TODO: Be sure this works on windows might need time.clock()
    while True:
      if proc.poll() is not None:
        return False
      secs = time.time() - beginning
      if secs > timeout:
        proc.kill()
        self.log.write("ERROR: Mozmill timeout\n")
        return True
      time.sleep(5)
      
    

def main():
  #pdb.set_trace()
  parser = MuttOptions()
  options, args = parser.parse_args()

  options = parser.verifyOptions(options)
  if options == None:
    sys.exit(1)

  results = ResultCollector(options.logfile)
  
  runner = TestRunner(results, options)
  runner.run()
  sys.exit(results.shutdown())

if __name__ == "__main__":
  main()
